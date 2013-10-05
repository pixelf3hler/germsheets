(function() {
   return function recommendedLineHeight(fontSize, lineWidth) {
      // 1.61803399 = golden ratio
      return !lineWidth ? Math.round(fontSize * 1.61803399) + "px" : Math.round(fontSize * (1.61803399 - (1 / (2 * 1.61803399)) * (1 - lineWidth / Math.pow(fontSize * 1.61803399, 2)))) + "px";
   }
})()