/**
 * 前端路由
 *
 * @author 老雷<leizongmin@gmail.com>
 */

(function (window) {

  // 使用TomatoRouter命名空间
  var me = window.TomatoRouter = {};

  me.debug = function (msg) {
    console.log('[' + new Date().toLocaleTimeString() + '] ' + msg);
  };

  //----------------------------------------------------------------------------
  /**
   * 路由对象
   */
  function Router () {
    // 存储路由表
    this.staticTable = {};       // 静态转换表
    this.regexpTable = [];       // 正则转换表
  }

  /**
   * 注册路由
   *
   * @param {string|RegExp} path 路径
   * @param {function|object} handle 处理函数
   * @param {object} data 附加信息
   * @return {bool}
   */
  Router.prototype.add = function (path, handle, data) {
    data = data || {};
    var p = this.parse(path);
    if (p === null) return false;
    if (p.path instanceof RegExp) {
      this.regexpTable.push({
        path:   p.path,
        handle: handle,
        names:  p.names,
        info:   data
      });
    } else {
      this.staticTable[p.path] = {
        handle: handle,
        info:   data
      };
    }
    return true;
  };

  /**
   * 查询路由
   *
   * @param {string} url 请求的路径
   * @param {int} index 开始位置（仅对regexpTable有效）
   * @return {object} 包含 index, handle, value, info 失败返回null
   */
  Router.prototype.query = function (url, index) {
    // 先检查是否在 staticTable 中，如果没有在，再逐个判断 regexpTable
    var _static_url = this.staticTable[url];
    if (_static_url) {
      return {
        index:  -1,                    // 索引位置
        handle: _static_url.handle,    // 处理句柄
        value:  null,                  // PATH参数值
        info:   _static_url.info       // 附件信息
      };
    }

    if (isNaN(index)) index = 0;
    for (var i = index, n = this.regexpTable.length; i < n; i++) {
      // 查找符合的处理函数
      var r = this.regexpTable[i];
      // 清除lastIndex信息
      r.lastIndex = 0;
      // 测试正则
      var pv = r.path.exec(url);
      if (pv === null) continue;

      // 填充匹配的PATH值
      var ret = {
        index:  i,           // 索引位置
        handle: r.handle,    // 处理句柄
        value:  {},          // PATH参数值
        info:   r.info       // 附加信息
      };
      // 填充value
      if (r.names !== null) {
        var rnames = r.names;
        for (var j = 0, nlen = rnames.length; j < nlen; j++) {
          ret.value[rnames[j]] = pv[j + 1];
        }
      } else {
        // 如果是自定义的RegExp，则使用数字索引
        ret.value = pv.slice(1);
      }

      return ret;
    }

    // 没找到则返回null
    return null;
  };

  /**
   * 解析路径
   *
   * @param {string|RegExp} path 路径
   * @return {object} 包含 path, names
   */
  Router.prototype.parse = function (path) {
    // 如果是RegExp类型，则直接返回
    if (path instanceof RegExp) return {path: path, names: null};

    // 如果不是string类型，返回null
    if (typeof path != 'string') return null;

    // 如果没有包含:name类型的路径，则直接返回string路径，否则将其编译成RegExp
    path = path.trim();
    var names = path.match(/:[\w\d_$]+/g);
    if (names !== null) {
      // 编译path路径
      for (var i = 0; i < names.length; i++) {
        names[i] = names[i].substr(1);
      }
    }
    // 替换正则表达式
    var path = '^' + path.replace(/:[\w\d_$]+/g, '([^/]+)') + '$';

    return {
      path:  new RegExp(path),
      names: names
    };
  };

  /**
   * 删除路由
   *
   * @param {string|RegExp} path 注册时填写的路径
   * @return {bool}
   */
  Router.prototype.remove = function (path) {
    var p = this.parse(path);

    if (p === null) return false;

    var isReomve = false;
    // 从 regexpTable 表中查找
    if (p.path instanceof RegExp) {
      path = p.path.toString();
      for (var i = 0; i < this.regexpTable.length; i++) {
        if (this.regexpTable[i].path.toString() === path) {
          this.regexpTable.splice(i, 1);
          isReomve = true;
          i--;
        }
      }
    } else if (p.path in this.staticTable) {
      // 从 staticTable 表中查找
      delete this.staticTable[p.path];
      isReomve = true;
    }

    return isReomve;
  };

  //----------------------------------------------------------------------------
  // 解析URL参数
  function parseQueryString (qs) {
    var sep = '&';
    var eq = '=';
    var obj = {};
    if (typeof qs !== 'string' || qs.length === 0) return obj;
    var regexp = /\+/g;
    qs = qs.split(sep);
    for (var i = 0, len = qs.length; i < len; ++i) {
      var x = qs[i].replace(regexp, '%20');
      var idx = x.indexOf(eq);
      var kstr = x.substring(0, idx);
      var vstr = x.substring(idx + 1);
      try {
        var k = decodeURIComponent(kstr);
        var v = decodeURIComponent(vstr);
      } catch (e) {
        var k = unescape(kstr, true);
        var v = unescape(vstr, true);
      }
      obj[k] = v;
    }
    return obj;
  };

  // 解析URL
  function parseUrl (url) {
    var ret = {};
    var qm = url.indexOf('?');
    if (qm === -1) {
      ret.path = url;
      ret.query = {};
    } else {
      ret.path = url.substr(0, qm);
      ret.query = parseQueryString(url.substr(qm + 1));
    }
    return ret;
  };

  //----------------------------------------------------------------------------
  me.router = new Router();

  function startWithSlash (url) {
    return (url[0] === '/');
  }

  function fixUrl (url) {
    return startWithSlash(url) ? url : '/' + url;
  }

  // 注册全局控制器
  me.on = function (url, handle) {
    url = fixUrl(url);
    me.router.add(url, handle);
    me.debug('监听: ' + url);
  };

  // 开始检查
  me.check = function (url) {
    url = url || location.hash.substr(1);
    if (!startWithSlash(url)) {
      me.debug('不符合要求的hash: ' + url);
      return;
    }
    url = parseUrl(url);
    var ret = null;
    var i = 0;
    var c = 0;
    while (ret = me.router.query(url.path, i)) {
      c++;
      me.debug('@' + c + '转到: ' + url.path);
      var obj = new HashEventObject(url, ret);
      try {
        ret.handle(obj);
      } catch (err) {
        console.error(err.stack);
      }
      if (ret.index < 0) break;
      i = ret.index + 1;
    }
    if (c < 1) {
      me.debug('没有注册的路由: ' + url.path);
      // 如果是首次打开页面，则自动跳转到首页
      if (!me._hasRedirectHome) {
        me._hasRedirectHome = true;
        me.debug('首次打开页面，自动跳转到 /');
        if (url.path !== '/') me.redirect('/');
      }
    }
  };

  // 跳转
  me.redirect = function (url) {
    me.debug('跳转: ' + url);
    location.hash = fixUrl(url);
  };

  // 刷新页面
  me.refresh = function () {
    me.debug('刷新');
    me.check();
  };

  // 初始化
  me.init = function () {
    me.debug('初始化');
    function onHashChange () {
      me.check();
    };
    // 监听hash变化
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('hashchange', onHashChange);
    } else if ('onhashchange' in window) {
      me.debug('on IE8');
      window.onhashchange = onHashChange;
    } else {
      me.debug('浏览器不支持hashchange事件');
    }
    // 首次打开页面
    if (startWithSlash(location.hash.substr(1))) {
      onHashChange();
    } else {
      me.debug('首次打开页面');
      me.redirect('/');
      me._hasRedirectHome = true;
    }
    // 设置已初始化
    me.initialized = true;
  };

  //----------------------------------------------------------------------------
  // 输出操作对象
  function HashEventObject (url, info) {
    this.path = url.path;
    this.query = url.query;
    this.params = info.value;
  };
  HashEventObject.prototype.redirect = me.redirect;
  me.HashEventObject = HashEventObject;

})(window);