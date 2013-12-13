/** 
 *  @file local cache
 *  @version 1.0.2
 *  @copyright © 2013 max ɐʇ pixelf3hler · de
 *  @author <max@pixelf3hler.de>
 *  @license license.txt
 *  The MIT License
 */
(function(window, undefined) {
   var germSheets = window.germSheets || {}
   
   germSheets.Cache = {}
   germSheets.Cache.write = function(key, value) {
      return window.localStorage.setItem(key, value)
   }
   germSheets.Cache.read = function(key) {
      return window.localStorage.getItem(key)
   }
   germSheets.Cache.erase = function(key) {
      if(!key) {
         window.localStorage.clear()
      }else {
         window.localStorage.removeItem(key)
      }
   }
   germSheets.Cache.hasInStore = function(key) {
      return (null !== window.localStorage.getItem(key))
   }
   germSheets.Cache.getCookie = function(key) {
      return window.document.cookie.replace(new RegExp('(?:(?:^|.*;\s*)' + key + '\s*\=\s*([^;]*).*$)|^.*$'), "$1") || null
   }
   germSheets.Cache.setCookie = function(key, value) {
      document.cookie = key + "=" + value
   }
   // shorthand apis
   germSheets.cache = function(key, value) {
      return !value ? germSheets.Cache.read(key) : germSheets.Cache.write(key, value)
   }
   germSheets.uncache = function(key) {
      key = key || ""
      return germSheets.Cache.erase(key)
   }
   germSheets.getClientId = function() {
      germSheets.clientId = germSheets.Cache.getCookie("gssClientId")
      return germSheets.clientId
   }
   
})(window)