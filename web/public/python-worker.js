import { loadPyodide } from "/vendor/pyodide/pyodide.mjs";
let runtime,
  active = {},
  busy = false;
const send = (type, extra = {}) =>
  self.postMessage({
    type,
    requestId: active.requestId,
    runId: active.runId,
    ...extra,
  });
self.onmessage = async ({ data }) => {
  if (busy) return;
  busy = true;
  active = data;
  try {
    if (data.type === "init") {
      runtime = await loadPyodide({ indexURL: "/vendor/pyodide/" });
      const files = await fetch("/book/python-files.json").then((r) => {
        if (!r.ok) throw Error("示例文件加载失败");
        return r.json();
      });
      for (const [path, source] of Object.entries(files)) {
        const target = "/book/" + path;
        runtime.FS.mkdirTree(target.slice(0, target.lastIndexOf("/")));
        runtime.FS.writeFile(target, source, { encoding: "utf8" });
      }
      runtime.setStdout({ batched: (text) => send("stdout", { text }) });
      runtime.setStderr({ batched: (text) => send("stderr", { text }) });
      runtime.runPython(
        'import sys\nsys.path.insert(0, "/book")\n_plex_base_path = sys.path.copy()',
      );
      send("ready");
    } else if (data.type === "run" || data.type === "check" || data.type === 'simulate') {
      if (!runtime) throw Error("Python 环境尚未就绪");
      const inputs = String(data.stdin || "").split("\n");
      let inputIndex = 0;
      runtime.setStdin({
        stdin: () => (inputIndex < inputs.length ? inputs[inputIndex++] : null),
      });
      runtime.globals.set("_plex_request_json", JSON.stringify(data));
      const serialized = await runtime.runPythonAsync(`
import json, traceback, os, copy
_request = json.loads(_plex_request_json)
_filename = '/book/' + _request.get('path', 'exercise.py')
sys.path[:] = [os.path.dirname(_filename)] + _plex_base_path
def _diagnostic(exc):
    frames = traceback.extract_tb(exc.__traceback__)
    frame = next((f for f in reversed(frames) if f.filename == _filename), None)
    return {'message': str(exc), 'filename': _filename, 'line': getattr(exc, 'lineno', None) or (frame.lineno if frame else None), 'column': getattr(exc, 'offset', None)}
_result = {}
try:
    _compiled = compile(_request['code'], _filename, 'exec')
    if _request['type'] == 'simulate':
        if _request.get('count') not in [1, 10, 100, 1000, 10000]:
            raise ValueError('试验次数不受支持')
        if type(_request.get('seed')) is not int or not 0 <= _request['seed'] <= 2147483647:
            raise ValueError('随机种子应为 0–2147483647 的整数')
        _scope = {'__name__': 'plex_simulation', '__file__': _filename}
        exec(_compiled, _scope)
        _result = {'simulation': _scope['simulate'](_request['count'], _request['seed'])}
    elif _request['type'] == 'check':
        _results = []
        for _case in _request['tests']:
            _scope = {'__name__': 'plex_exercise', '__file__': _filename}
            try:
                exec(_compiled, _scope)
                _actual = _scope['solve'](*copy.deepcopy(_case['args']))
                _actual = json.loads(json.dumps(_actual, ensure_ascii=False))
                _results.append({'input': _case['args'], 'expected': _case['expected'], 'actual': _actual, 'passed': _actual == _case['expected']})
            except BaseException as _exc:
                _results.append({'input': _case['args'], 'expected': _case['expected'], 'actual': None, 'passed': False, 'error': str(_exc), 'diagnostic': _diagnostic(_exc)})
        _result = {'results': _results, 'diagnostic': next((r['diagnostic'] for r in _results if 'diagnostic' in r), None)}
    else:
        exec(_compiled, {'__name__': '__main__', '__file__': _filename})
except BaseException as _exc:
    _result = {'error': traceback.format_exc(), 'diagnostic': _diagnostic(_exc)}
json.dumps(_result, ensure_ascii=False)
`);
      const result = JSON.parse(serialized);
      send(result.error ? "error" : data.type === "check" ? "result" : "done", {
        ...result,
        text: result.error,
      });
    }
  } catch (error) {
    send("error", { text: String(error) });
  } finally {
    busy = false;
  }
};
