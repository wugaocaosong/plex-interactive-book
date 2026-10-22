import { loadPyodide } from '/vendor/pyodide/pyodide.mjs';
let runtime;
self.onmessage = async ({data}) => {
  try {
    if (data.type === 'init') {
      runtime = await loadPyodide({indexURL: '/vendor/pyodide/'});
      const files = await fetch('/book/python-files.json').then(r => { if(!r.ok) throw Error('示例文件加载失败'); return r.json() });
      for (const [path, source] of Object.entries(files)) {
        const target = '/book/' + path;
        runtime.FS.mkdirTree(target.slice(0, target.lastIndexOf('/')));
        runtime.FS.writeFile(target, source, {encoding: 'utf8'});
      }
      runtime.setStdout({batched: text => self.postMessage({type: 'stdout', text})});
      runtime.setStderr({batched: text => self.postMessage({type: 'stderr', text})});
      runtime.runPython('import sys\nsys.path.insert(0, "/book")\n_plex_base_path = sys.path.copy()');
      self.postMessage({type: 'ready'});
    }
    if (data.type === 'run') {
      if(!runtime) throw Error('Python 环境尚未就绪');
      const filename = '/book/' + data.path;
      runtime.runPython(`sys.path[:] = [${JSON.stringify(filename.slice(0, filename.lastIndexOf('/')))}] + _plex_base_path`);
      const globals = runtime.toPy({__name__: '__main__', __file__: filename});
      try { await runtime.runPythonAsync(data.code, {globals}); }
      finally { globals.destroy(); }
      self.postMessage({type: 'done'});
    }
  } catch(error) { self.postMessage({type: 'error', text: String(error)}); }
};
