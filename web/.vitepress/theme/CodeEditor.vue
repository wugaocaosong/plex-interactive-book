<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { setDiagnostics } from "@codemirror/lint";
import { unifiedMergeView } from "@codemirror/merge";
import {codeFolding, foldEffect} from "@codemirror/language";
import type { Diagnostic } from "./types";
const props = defineProps<{
  modelValue: string;
  readonly?: boolean;
  original?: string;
  diagnostics?: Diagnostic[];
  foldSourceHeader?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string]; blur: []; selection:[value:string] }>();
const host = ref<HTMLElement>();
let view: EditorView | undefined;
function foldHeader(){
  if(!props.foldSourceHeader||!view)return;
  const head=view.state.doc.toString().match(/^(?:"""[\s\S]*?"""|'''[\s\S]*?''')/);
  if(head&&/Author:|Created Time:/.test(head[0]))view.dispatch({effects:foldEffect.of({from:0,to:head[0].length})});
}
const editable = new Compartment(),
  diff = new Compartment();
onMounted(() => {
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        ...(props.foldSourceHeader?[codeFolding({placeholderDOM:(_view,onclick)=>{const button=document.createElement('button');button.textContent='源码信息（展开）';button.onclick=onclick;return button;}})]:[]),
        python(),
        EditorView.contentAttributes.of({
          "aria-label": "完整示例代码",
          role: "textbox",
          "aria-multiline": "true",
        }),
        editable.of(EditorState.readOnly.of(!!props.readonly)),
        diff.of(
          props.original !== undefined
            ? unifiedMergeView({ original: props.original })
            : [],
        ),
        EditorView.updateListener.of((update) => {
          if(update.selectionSet||update.docChanged)emit("selection",update.state.sliceDoc(update.state.selection.main.from,update.state.selection.main.to));
          if (update.docChanged)
            emit("update:modelValue", update.state.doc.toString());
        }),
        EditorView.domEventHandlers({ blur: () => emit("blur") }),
      ],
    }),
  });
  foldHeader();
});
watch(
  () => props.modelValue,
  (value) => {
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
      foldHeader();
    }
  },
);
watch(
  () => props.readonly,
  (value) =>
    view?.dispatch({
      effects: editable.reconfigure(EditorState.readOnly.of(!!value)),
    }),
);
watch(
  () => props.original,
  (value) =>
    view?.dispatch({
      effects: diff.reconfigure(
        value !== undefined ? unifiedMergeView({ original: value }) : [],
      ),
    }),
);
watch(
  () => props.diagnostics,
  (value) => {
    if (view)
      view.dispatch(
        setDiagnostics(
          view.state,
          (value || [])
            .filter((d) => d.line)
            .map((d) => {
              const line = view!.state.doc.line(
                Math.max(1, Math.min(d.line!, view!.state.doc.lines)),
              );
              return {
                from: line.from,
                to: line.to,
                severity: "error",
                message: d.message,
              };
            }),
        ),
      );
  },
  { deep: true },
);
function focusLine(line: number) {
  if (!view) return;
  const start = view.state.doc.line(
    Math.max(1, Math.min(line, view.state.doc.lines)),
  ).from;
  view.dispatch({ selection: { anchor: start }, scrollIntoView: true });
  view.focus();
}
onBeforeUnmount(() => view?.destroy());
defineExpose({ focusLine, getSelection:()=>view?view.state.sliceDoc(view.state.selection.main.from,view.state.selection.main.to):"" });
</script>
<template><div ref="host" class="code-editor-host" /></template>
