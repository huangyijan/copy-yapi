// const configJsonForm = document.getElementById()
var editor = new JSONEditor(document.getElementById('editor_config'),{
  disable_collapse: true,
  disable_properties: true,
  schema: {
    type: "object",
    title: "API 全局配置项",
    properties: {
      make: {
        type: "boolean",
        
      },
      model: {
        type: "string"
      },
    }
  }
});

// Hook up the submit button to log to the console
document.getElementById('submit').addEventListener('click',function() {
  // Get the value from the editor
  console.log(editor.getValue());
});