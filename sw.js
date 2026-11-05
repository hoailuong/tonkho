/* Mở app: lấy ngay từ bộ nhớ máy (nhanh), đồng thời kiểm tra bản mới ở nền.
   Chỉ báo "Cập nhật" khi bản trên máy chủ thật sự mới hơn (số phiên bản lớn hơn); lần mở sau tự dùng bản mới.
   Mọi cách mở trang (…/  ,  …/index.html  ,  có ?query) dùng CHUNG một bản lưu, nên cập nhật một lần là đủ cho mọi cách mở. */
var C="tonkho-shell-v3";
var IDX=new URL("./index.html",self.registration.scope).href;
var F=[IDX,new URL("./manifest.webmanifest",self.registration.scope).href,new URL("./icon-192.png",self.registration.scope).href,new URL("./icon-512.png",self.registration.scope).href];
function isIdx(p){return /\/$/.test(p)||/\/index\.html$/.test(p)}
function key(u){var x=new URL(u);x.search="";x.hash="";return isIdx(x.pathname)?IDX:x.href}
function ver(t){var m=/Phiên bản v(\d+)/.exec(t||"");return m?+m[1]:0}
function notify(v){self.clients.matchAll({type:"window"}).then(function(l){l.forEach(function(w){w.postMessage({t:"upd",v:v})})})}
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(C).then(function(c){return Promise.all(F.map(function(u){return fetch(u,{cache:"reload"}).then(function(r){if(r.ok)return c.put(u,r)}).catch(function(){})}))}).then(function(){return self.skipWaiting()}));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C}).map(function(x){return caches.delete(x)}))}).then(function(){
    /* dọn các bản lưu trùng kiểu cũ (…/ hoặc có ?query) để không còn bản cũ nằm sót */
    return caches.open(C).then(function(c){return c.keys().then(function(ks){return Promise.all(ks.filter(function(r){return key(r.url)!==r.url}).map(function(r){return c.delete(r)}))})});
  }).then(function(){return self.clients.claim()}));
});
self.addEventListener("fetch",function(e){
  var q=e.request;
  if(q.method!=="GET"||new URL(q.url).origin!==location.origin)return;
  var k=key(q.url),idx=k===IDX;
  e.respondWith(caches.open(C).then(function(c){
    return c.match(k).then(function(m){
      var mc=m&&m.clone();                          /* bản sao để so sánh ở nền (m sẽ được trả cho trang) */
      var net=fetch(k,{cache:"no-cache"}).then(function(r){
        if(!(r&&r.ok))return r;
        if(!idx||!m)return c.put(k,r.clone()).then(function(){return r});
        return Promise.all([mc.text(),r.clone().text()]).then(function(t){
          if(t[0]===t[1])return r;                    /* giống hệt: không làm gì */
          var vm=ver(t[0]),vr=ver(t[1]);
          if(vm&&vr&&vr<vm)return r;                  /* máy chủ trả bản cũ hơn (CDN chưa kịp đồng bộ): giữ bản đang lưu */
          return c.put(k,r.clone()).then(function(){notify(vr);return r});
        });
      }).catch(function(){return null});
      e.waitUntil(net);
      if(m)return m;
      return net.then(function(r){return r||c.match(IDX)});
    });
  }));
});
