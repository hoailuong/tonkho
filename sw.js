/* Mở app: lấy ngay từ bộ nhớ máy (nhanh), đồng thời kiểm tra bản mới ở nền.
   Có bản mới thì báo cho trang hiện nút "Cập nhật"; lần mở sau tự dùng bản mới. */
var C="tonkho-shell-v3",F=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
function sig(r){return r.headers.get("etag")||r.headers.get("last-modified")||r.headers.get("content-length")||""}
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(C).then(function(c){return Promise.all(F.map(function(u){return fetch(u,{cache:"reload"}).then(function(r){if(r.ok)return c.put(u,r)}).catch(function(){})}))}).then(function(){return self.skipWaiting()}));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}));
});
self.addEventListener("fetch",function(e){
  var q=e.request;
  if(q.method!=="GET"||new URL(q.url).origin!==location.origin)return;
  e.respondWith(caches.open(C).then(function(c){
    return c.match(q,{ignoreSearch:true}).then(function(m){
      var net=fetch(q.url,{cache:"no-cache"}).then(function(r){
        if(r&&r.ok){
          var changed=m&&sig(m)&&sig(r)&&sig(m)!==sig(r);
          return c.put(q.url,r.clone()).then(function(){
            if(changed&&(q.mode==="navigate"||/index\.html$/.test(q.url))){
              self.clients.matchAll({type:"window"}).then(function(l){l.forEach(function(w){w.postMessage({t:"upd"})})});
            }
            return r;
          });
        }
        return r;
      }).catch(function(){return null});
      e.waitUntil(net);
      if(m)return m;
      return net.then(function(r){return r||c.match("./")||c.match("./index.html")});
    });
  }));
});
