(function() {
   return function recommendedLineWidth(fontSize, lineHeight) {
      return Math.round(Math.pow(fontSize * 1.61803399, 2) * (1 + 2 * 1.61803399 * (lineHeight / fontSize - 1.61803399)))
   }
})()