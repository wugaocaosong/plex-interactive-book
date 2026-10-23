<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { setDiagnostics } from "@codemirror/lint";
import { unifiedMergeView } from "@codemirror/merge";
import type { Diagnostic } from "./types";
const props = defineProps<{
  modelValue: string;
  readonly?: boolean;
  original?: string;
  diagnostics?: Diagnostic[];
}>();
const emit = defineEmits<{ "update:modelValue": [value: string]; blur: [] }>();
const host = ref<HTMLElement>();
let view: EditorView | undefined;
const editable = new Compartment(),
  diff = new Compartment();
onMounted(() => {
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
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
          if (update.docChanged)
            emit("update:modelValue", update.state.doc.toString());
        }),
        EditorView.domEventHandlers({ blur: () => emit("blur") }),
      ],
    }),
  });
});
watch(
  () => props.modelValue,
  (value) => {
    if (view && view.state.doc.toString() !== value)
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
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
defineExpose({ focusLine });
</script>
<template><div ref="host" class="code-editor-host" /></template>
