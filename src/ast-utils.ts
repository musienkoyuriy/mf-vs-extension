export const traverse = (node: any, func: (node: any) => void) => {
  func(node);
  for (var key in node) {
    if (node.hasOwnProperty(key)) {
      var child = node[key];
      if (typeof child === "object" && child !== null) {
        if (Array.isArray(child)) {
          child.forEach(function (node) {
            traverse(node, func);
          });
        } else {
          traverse(child, func);
        }
      }
    }
  }
};
