(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([["cartList"],{"0378":function(t,e,c){"use strict";c("3065")},"0eb4":function(t,e,c){"use strict";c.d(e,"b",(function(){return o}));var r=c("7a23"),n=Object(r["I"])("data-v-6a17f40c");Object(r["t"])("data-v-6a17f40c");var a={class:"toast"};Object(r["r"])();var s=n((function(t,e,c,n,s,i){return Object(r["q"])(),Object(r["d"])("div",a,Object(r["z"])(c.message),1)})),i=c("5530"),o=function(){var t=Object(r["u"])({show:!1,message:""}),e=function(e){t.show=!0,t.message=e,setTimeout((function(){t.show=!1,t.message=""}),2e3)};return Object(i["a"])(Object(i["a"])({},Object(r["A"])(t)),{},{showToast:e})},d={props:["message"]};c("f567");d.render=s,d.__scopeId="data-v-6a17f40c";e["a"]=d},1148:function(t,e,c){"use strict";var r=c("a691"),n=c("1d80");t.exports="".repeat||function(t){var e=String(n(this)),c="",a=r(t);if(a<0||a==1/0)throw RangeError("Wrong number of repetitions");for(;a>0;(a>>>=1)&&(e+=e))1&a&&(c+=e);return c}},"154a":function(t,e,c){"use strict";c("7060")},"19e9":function(t,e,c){"use strict";c("96cf");var r=c("1da1"),n=c("5502"),a=c("b775"),s=function(){var t=Object(n["b"])(),e=function(){var e=Object(r["a"])(regeneratorRuntime.mark((function e(c){var r,n,s;return regeneratorRuntime.wrap((function(e){while(1)switch(e.prev=e.next){case 0:if(r=t.state.addressList,!c&&r.length){e.next=6;break}return e.next=4,Object(a["a"])("/api/user/address");case 4:s=e.sent,null!==s&&void 0!==s&&null!==(n=s.data)&&void 0!==n&&n.length&&t.commit("changeAddressList",s.data);case 6:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}();return{getAddressList:e}};e["a"]=s},"1d64":function(t,e,c){"use strict";c("3c1b")},3065:function(t,e,c){},3298:function(t,e,c){},"3c1b":function(t,e,c){},"3c1d":function(t,e,c){"use strict";c("b0c0");var r=c("7a23"),n=Object(r["I"])("data-v-51fccc90");Object(r["t"])("data-v-51fccc90");var a={class:"docker"},s={class:"docker__title"};Object(r["r"])();var i=n((function(t,e,c,i,o,d){var u=Object(r["x"])("router-link");return Object(r["q"])(),Object(r["d"])("div",a,[(Object(r["q"])(!0),Object(r["d"])(r["a"],null,Object(r["w"])(i.dockerList,(function(t){return Object(r["q"])(),Object(r["d"])("div",{class:["docker__item",{"docker__item--active":i.route.name===t.to.name}],key:t.icon},[Object(r["h"])(u,{to:t.to},{default:n((function(){return[Object(r["h"])("span",{class:"iconfont",innerHTML:t.icon},null,8,["innerHTML"]),Object(r["h"])("span",s,Object(r["z"])(t.text),1)]})),_:2},1032,["to"])],2)})),128))])})),o=c("6c02"),d={name:"Docker",setup:function(){var t=Object(o["c"])(),e=[{icon:"&#xe602;",text:"首页",to:{name:"Home"}},{icon:"&#xe645;",text:"购物车",to:{name:"CartList"}},{icon:"&#xe600;",text:"订单",to:{name:"OrderList"}},{icon:"Profile"===t.name?"&#xe604;":"&#xe65f;",text:"我的",to:{name:"Profile"}}];return{dockerList:e,route:t}}};c("0378");d.render=i,d.__scopeId="data-v-51fccc90";e["a"]=d},"3c97":function(t,e,c){"use strict";c.d(e,"a",(function(){return n}));var r=c("5502"),n=function(){var t=Object(r["b"])(),e=t.state.cartList,c=function(e,c,r,n){t.commit("changeCartItemInfo",{shopId:e,productId:c,productInfo:r,num:n})};return{cartList:e,changeCartItemInfo:c}}},"408a":function(t,e,c){var r=c("c6b6");t.exports=function(t){if("number"!=typeof t&&"Number"!=r(t))throw TypeError("Incorrect invocation");return+t}},"45a7":function(t,e,c){"use strict";c.r(e);c("b0c0"),c("b680");var r=c("7a23"),n=Object(r["I"])("data-v-6e6b90da");Object(r["t"])("data-v-6e6b90da");var a={class:"wrapper"},s={class:"title"},i={class:"shops"},o={key:0,class:"empty"},d={class:"shop__title"},u={class:"products"},b={key:0,class:"products__item"},O={class:"products__item__detail"},j={class:"products__item__title"},l={class:"products__item__price"},_={class:"products__item__num"},v=Object(r["h"])("span",{class:"products__item__yen"},"¥",-1),f={class:"products__item__total"},p=Object(r["h"])("span",{class:"products__item__yen"},"¥",-1);Object(r["r"])();var h=n((function(t,e,c,n,h,m){var k=Object(r["x"])("Docker");return Object(r["q"])(),Object(r["d"])("div",a,[Object(r["h"])("div",s,"我的全部购物车"+Object(r["z"])("（".concat(n.cartNum,"）")),1),Object(r["h"])("div",i,[0===n.cartNum?(Object(r["q"])(),Object(r["d"])("div",o,"购物车当前为空")):Object(r["e"])("",!0),(Object(r["q"])(!0),Object(r["d"])(r["a"],null,Object(r["w"])(n.cartListWithProducts,(function(t,e){return Object(r["q"])(),Object(r["d"])("div",{class:"shop",key:e},[Object(r["h"])("div",d,Object(r["z"])(t.shopName),1),Object(r["h"])("div",u,[(Object(r["q"])(!0),Object(r["d"])(r["a"],null,Object(r["w"])(t.productList,(function(t){return Object(r["q"])(),Object(r["d"])(r["a"],{key:t._id},[t.count>0?(Object(r["q"])(),Object(r["d"])("div",b,[Object(r["h"])("img",{src:t.imgUrl,class:"products__item__img"},null,8,["src"]),Object(r["h"])("div",O,[Object(r["h"])("h4",j,Object(r["z"])(t.name),1),Object(r["h"])("p",l,[Object(r["h"])("span",_,[v,Object(r["g"])(" "+Object(r["z"])(t.price)+" x "+Object(r["z"])(t.count),1)]),Object(r["h"])("span",f,[p,Object(r["g"])(" "+Object(r["z"])(((t.price||0)*(t.count||0)).toFixed(2)),1)])])])])):Object(r["e"])("",!0)],64)})),128))])])})),128))]),Object(r["h"])(k)])})),m=(c("b64b"),c("5502")),k=c("3c1d"),g={components:{Docker:k["a"]},name:"CartList",setup:function(){var t=Object(m["b"])(),e=t.state.cartList,c=Object(r["b"])((function(){var t={};for(var c in e){var r=0,n=e[c].productList;for(var a in n){var s=n[a];r+=s.count||0}r>0&&(t[c]=e[c])}return t})),n=Object(r["b"])((function(){return Object.keys(c.value).length}));return{cartListWithProducts:c,cartNum:n}}};c("a4fb");g.render=h,g.__scopeId="data-v-6e6b90da";e["default"]=g},"53c5":function(t,e,c){"use strict";c("546d")},5463:function(t,e,c){"use strict";c("ddc3")},"546d":function(t,e,c){},6318:function(t,e,c){"use strict";c("9e58")},7060:function(t,e,c){},"77a1":function(t,e,c){"use strict";c.r(e);var r=c("7a23"),n=Object(r["I"])("data-v-51cabc8a");Object(r["t"])("data-v-51cabc8a");var a={class:"wrapper"},s=Object(r["h"])("div",{class:"title"},"我的订单",-1),i={class:"orders"},o={class:"order__title"},d={class:"order__status"},u={class:"order__content"},b={class:"order__content__imgs"},O={class:"order__content__info"},j={class:"order__content__price"},l={class:"order__content__count"};Object(r["r"])();var _=n((function(t,e,c,n,_,v){var f=Object(r["x"])("Docker");return Object(r["q"])(),Object(r["d"])(r["a"],null,[Object(r["h"])("div",a,[s,Object(r["h"])("div",i,[(Object(r["q"])(!0),Object(r["d"])(r["a"],null,Object(r["w"])(t.list,(function(t,e){return Object(r["q"])(),Object(r["d"])("div",{class:"order",key:e},[Object(r["h"])("div",o,[Object(r["g"])(Object(r["z"])(t.shopName)+" ",1),Object(r["h"])("span",d,Object(r["z"])(t.isCanceled?"已取消":"已下单"),1)]),Object(r["h"])("div",u,[Object(r["h"])("div",b,[(Object(r["q"])(!0),Object(r["d"])(r["a"],null,Object(r["w"])(t.products,(function(t,e){return Object(r["q"])(),Object(r["d"])(r["a"],{key:e},[e<=3?(Object(r["q"])(),Object(r["d"])("img",{key:0,src:t.product.img,class:"order__content__img"},null,8,["src"])):Object(r["e"])("",!0)],64)})),128))]),Object(r["h"])("div",O,[Object(r["h"])("div",j,"¥ "+Object(r["z"])(t.totalPrice),1),Object(r["h"])("div",l,"共 "+Object(r["z"])(t.totalNum)+" 件",1)])])])})),128))])]),Object(r["h"])(f)],64)})),v=(c("4160"),c("159b"),c("5530")),f=(c("96cf"),c("1da1")),p=c("b775"),h=c("3c1d"),m=function(){var t=Object(r["u"])({list:[]}),e=function(){var e=Object(f["a"])(regeneratorRuntime.mark((function e(){var c,r,n;return regeneratorRuntime.wrap((function(e){while(1)switch(e.prev=e.next){case 0:return e.next=2,Object(p["a"])("/api/order");case 2:r=e.sent,0===(null===r||void 0===r?void 0:r.errno)&&null!==r&&void 0!==r&&null!==(c=r.data)&&void 0!==c&&c.length&&(n=r.data||[],n.forEach((function(t){t.totalPrice=0,t.totalNum=0,(t.products||[]).forEach((function(e){var c;t.totalPrice+=((null===e||void 0===e||null===(c=e.product)||void 0===c?void 0:c.price)||0)*((null===e||void 0===e?void 0:e.orderSales)||0),t.totalNum+=(null===e||void 0===e?void 0:e.orderSales)||0}))})),t.list=n);case 4:case"end":return e.stop()}}),e)})));return function(){return e.apply(this,arguments)}}();return e(),Object(v["a"])({},Object(r["A"])(t))},k={name:"OrderList",components:{Docker:h["a"]},setup:function(){return Object(v["a"])({},m())}};c("1d64");k.render=_,k.__scopeId="data-v-51cabc8a";e["default"]=k},"7db0":function(t,e,c){"use strict";var r=c("23e7"),n=c("b727").find,a=c("44d2"),s=c("ae40"),i="find",o=!0,d=s(i);i in[]&&Array(1)[i]((function(){o=!1})),r({target:"Array",proto:!0,forced:o||!d},{find:function(t){return n(this,t,arguments.length>1?arguments[1]:void 0)}}),a(i)},"8a2d":function(t,e,c){},"9e58":function(t,e,c){},a4fb:function(t,e,c){"use strict";c("8a2d")},b680:function(t,e,c){"use strict";var r=c("23e7"),n=c("a691"),a=c("408a"),s=c("1148"),i=c("d039"),o=1..toFixed,d=Math.floor,u=function(t,e,c){return 0===e?c:e%2===1?u(t,e-1,c*t):u(t*t,e/2,c)},b=function(t){var e=0,c=t;while(c>=4096)e+=12,c/=4096;while(c>=2)e+=1,c/=2;return e},O=o&&("0.000"!==8e-5.toFixed(3)||"1"!==.9.toFixed(0)||"1.25"!==1.255.toFixed(2)||"1000000000000000128"!==(0xde0b6b3a7640080).toFixed(0))||!i((function(){o.call({})}));r({target:"Number",proto:!0,forced:O},{toFixed:function(t){var e,c,r,i,o=a(this),O=n(t),j=[0,0,0,0,0,0],l="",_="0",v=function(t,e){var c=-1,r=e;while(++c<6)r+=t*j[c],j[c]=r%1e7,r=d(r/1e7)},f=function(t){var e=6,c=0;while(--e>=0)c+=j[e],j[e]=d(c/t),c=c%t*1e7},p=function(){var t=6,e="";while(--t>=0)if(""!==e||0===t||0!==j[t]){var c=String(j[t]);e=""===e?c:e+s.call("0",7-c.length)+c}return e};if(O<0||O>20)throw RangeError("Incorrect fraction digits");if(o!=o)return"NaN";if(o<=-1e21||o>=1e21)return String(o);if(o<0&&(l="-",o=-o),o>1e-21)if(e=b(o*u(2,69,1))-69,c=e<0?o*u(2,-e,1):o/u(2,e,1),c*=4503599627370496,e=52-e,e>0){v(0,c),r=O;while(r>=7)v(1e7,0),r-=7;v(u(10,r,1),0),r=e-1;while(r>=23)f(1<<23),r-=23;f(1<<r),v(1,1),f(2),_=p()}else v(0,c),v(1<<-e,0),_=p()+s.call("0",O);return O>0?(i=_.length,_=l+(i<=O?"0."+s.call("0",O-i)+_:_.slice(0,i-O)+"."+_.slice(i-O))):_=l+_,_}})},b957:function(t,e,c){"use strict";c.r(e);var r=c("7a23"),n=Object(r["I"])("data-v-41d89e67");Object(r["t"])("data-v-41d89e67");var a={class:"wrapper"};Object(r["r"])();var s=n((function(t,e,c,n,s,i){var o=Object(r["x"])("TopArea"),d=Object(r["x"])("ProductList"),u=Object(r["x"])("SubmitOrder");return Object(r["q"])(),Object(r["d"])("div",a,[Object(r["h"])(o),Object(r["h"])(d),Object(r["h"])(u)])})),i=(c("b0c0"),Object(r["I"])("data-v-0ad7ee95"));Object(r["t"])("data-v-0ad7ee95");var o={class:"top"},d={class:"top__header"},u=Object(r["h"])("div",{class:"top__header__title"},"确认订单",-1),b={class:"top__receiver"},O=Object(r["h"])("div",{class:"top__receiver__title"},"收货地址",-1),j={class:"top__receiver__address"},l={class:"top__receiver__info"},_={class:"top__receiver__info__item"},v={class:"top__receiver__info__item"},f=Object(r["h"])("div",{class:"top__receiver__icon iconfont"},"",-1),p={key:1},h=Object(r["h"])("div",{class:"top__receiver__address"},"暂无可用地址",-1);Object(r["r"])();var m=i((function(t,e,c,n,a,s){return Object(r["q"])(),Object(r["d"])("div",o,[Object(r["h"])("div",d,[Object(r["h"])("div",{class:"top__header__back iconfont",onClick:e[1]||(e[1]=function(){return n.handleClickBack&&n.handleClickBack.apply(n,arguments)})},""),u]),Object(r["h"])("div",b,[O,n.address?(Object(r["q"])(),Object(r["d"])("div",{key:0,onClick:e[2]||(e[2]=function(){return n.handleAddressClick&&n.handleAddressClick.apply(n,arguments)})},[Object(r["h"])("div",j,Object(r["z"])(n.address.city)+Object(r["z"])(n.address.department)+Object(r["z"])(n.address.houseNumber),1),Object(r["h"])("div",l,[Object(r["h"])("span",_,Object(r["z"])(n.address.name),1),Object(r["h"])("span",v,Object(r["z"])(n.address.phone),1)]),f])):(Object(r["q"])(),Object(r["d"])("div",p,[h]))])])})),k=c("6c02"),g=c("19e9"),w=(c("7db0"),c("5502")),x=function(){var t=Object(w["b"])(),e=Object(k["c"])(),c=e.params.addressId,n=Object(r["b"])((function(){var e=t.state.addressList;return e.find((function(t){return t._id===c}))||e[0]}));return n},C=x,y={name:"OrderConfirmation",setup:function(){var t=Object(k["d"])(),e=Object(k["c"])(),c=e.params.id,r=function(){return t.back()},n=function(){return t.push("/chooseAddressList/".concat(c))},a=Object(g["a"])(),s=a.getAddressList;s();var i=C();return{handleClickBack:r,handleAddressClick:n,address:i}}};c("6318");y.render=m,y.__scopeId="data-v-0ad7ee95";var L=y,I=(c("b680"),Object(r["I"])("data-v-43e0806e"));Object(r["t"])("data-v-43e0806e");var q={class:"content"},z={class:"shopname"},N={class:"products_wrapper"},A={class:"products"},S={key:0,class:"products__item"},P={class:"products__item__detail"},T={class:"products__item__title"},F={class:"products__item__price"},R={class:"products__item__num"},D=Object(r["h"])("span",{class:"products__item__yen"},"¥",-1),E={class:"products__item__total"},H=Object(r["h"])("span",{class:"products__item__yen"},"¥",-1);Object(r["r"])();var B=I((function(t,e,c,n,a,s){return Object(r["q"])(),Object(r["d"])("div",q,[Object(r["h"])("div",z,Object(r["z"])(n.shopName),1),Object(r["h"])("div",N,[Object(r["h"])("div",A,[(Object(r["q"])(!0),Object(r["d"])(r["a"],null,Object(r["w"])(n.productList,(function(t){return Object(r["q"])(),Object(r["d"])(r["a"],{key:t._id},[t.count>0&&t.check?(Object(r["q"])(),Object(r["d"])("div",S,[Object(r["h"])("img",{src:t.imgUrl,alt:"img",class:"products__item__img"},null,8,["src"]),Object(r["h"])("div",P,[Object(r["h"])("h4",T,Object(r["z"])(t.name),1),Object(r["h"])("p",F,[Object(r["h"])("span",R,[D,Object(r["g"])(Object(r["z"])(t.price)+" x "+Object(r["z"])(t.count),1)]),Object(r["h"])("span",E,[H,Object(r["g"])(Object(r["z"])((t.count*t.price).toFixed(2)),1)])])])])):Object(r["e"])("",!0)],64)})),128))])])])})),M=c("3c97"),W={name:"OrderConfirmation",setup:function(){var t=Object(k["c"])(),e=t.params.id,c=Object(M["a"])(),n=c.cartList,a=Object(r["b"])((function(){var t;return(null===(t=n[e])||void 0===t?void 0:t.shopName)||""})),s=Object(r["b"])((function(){var t;return(null===(t=n[e])||void 0===t?void 0:t.productList)||{}}));return{shopName:a,productList:s}}};c("53c5");W.render=B,W.__scopeId="data-v-43e0806e";var J=W,U=Object(r["I"])("data-v-6eccfbc8");Object(r["t"])("data-v-6eccfbc8");var G={class:"order"},K={class:"order__price"},Q=Object(r["g"])(" 实付金额"),V={class:"order__price__num"},X=Object(r["h"])("h3",{class:"mask__content__title"},"确认要离开收银台？",-1),Y=Object(r["h"])("p",{class:"mask__content__desc"},"请尽快完成支付，否则将被取消",-1),Z={class:"mask__content__btns"};Object(r["r"])();var $=U((function(t,e,c,n,a,s){var i=Object(r["x"])("Toast");return Object(r["q"])(),Object(r["d"])(r["a"],null,[Object(r["h"])("div",G,[Object(r["h"])("div",K,[Q,Object(r["h"])("span",V,"¥"+Object(r["z"])(t.price),1)]),t.address?(Object(r["q"])(),Object(r["d"])("div",{key:0,class:"order__btn",onClick:e[1]||(e[1]=function(e){return t.handleShowConformChange(!0)})},"提交订单")):Object(r["e"])("",!0)]),Object(r["G"])(Object(r["h"])("div",{class:"mask",onClick:e[5]||(e[5]=function(e){return t.handleShowConformChange(!1)})},[Object(r["h"])("div",{class:"mask__content",onClick:e[4]||(e[4]=Object(r["H"])((function(){}),["stop"]))},[X,Y,Object(r["h"])("div",Z,[Object(r["h"])("div",{class:"mask__content__btn",onClick:e[2]||(e[2]=function(e){return t.handleConfirmOrder(!0)})},"取消订单"),Object(r["h"])("div",{class:"mask__content__btn",onClick:e[3]||(e[3]=function(e){return t.handleConfirmOrder(!1)})},"确认支付")])])],512),[[r["D"],t.showConfirm]]),t.show?(Object(r["q"])(),Object(r["d"])(i,{key:0,message:t.message},null,8,["message"])):Object(r["e"])("",!0)],64)})),tt=(c("d81d"),c("07ac"),c("5530")),et=(c("96cf"),c("1da1")),ct=c("b775"),rt=c("0eb4"),nt=function(){var t=Object(w["b"])(),e=Object(k["d"])(),c=Object(k["c"])(),n=c.params.id,a=Object(M["a"])(),s=a.cartList,i=Object(rt["b"])(),o=i.show,d=i.message,u=i.showToast,b=C(),O=Object(r["b"])((function(){var t=s[n]||{},e=t.productList,c=0;if(e)for(var r in e)e[r].check&&(c+=e[r].count*e[r].price);return c.toFixed(2)})),j=Object(r["b"])((function(){var t;return(null===(t=s[n])||void 0===t?void 0:t.shopName)||""})),l=Object(r["b"])((function(){var t,e=(null===(t=s[n])||void 0===t?void 0:t.productList)||{};return Object.values(e).map((function(t){return{id:parseInt(t._id,10),num:t.num}}))})),_=function(){var c=Object(et["a"])(regeneratorRuntime.mark((function c(r){var a;return regeneratorRuntime.wrap((function(c){while(1)switch(c.prev=c.next){case 0:return c.prev=0,c.next=3,Object(ct["c"])("/api/order",{addressId:b.value._id,shopId:n,shopName:j.value,isCanceled:r,products:l.value});case 3:a=c.sent,0===(null===a||void 0===a?void 0:a.errno)?(t.commit("emptyCartProducts",{shopId:n}),e.push({name:"OrderList"})):u("注册失败"),c.next=10;break;case 7:c.prev=7,c.t0=c["catch"](0),u("请求失败");case 10:case"end":return c.stop()}}),c,null,[[0,7]])})));return function(t){return c.apply(this,arguments)}}();return{show:o,message:d,handleConfirmOrder:_,price:O,address:b}},at=function(){var t=Object(r["v"])(!1),e=function(e){t.value=e};return{showConfirm:t,handleShowConformChange:e}},st={name:"SubmitOrder",components:{Toast:rt["a"]},setup:function(t){return Object(tt["a"])(Object(tt["a"])({},nt()),at())}};c("5463");st.render=$,st.__scopeId="data-v-6eccfbc8";var it=st,ot={name:"OrderConfirmation",components:{TopArea:L,ProductList:J,SubmitOrder:it}};c("154a");ot.render=s,ot.__scopeId="data-v-41d89e67";e["default"]=ot},d81d:function(t,e,c){"use strict";var r=c("23e7"),n=c("b727").map,a=c("1dde"),s=c("ae40"),i=a("map"),o=s("map");r({target:"Array",proto:!0,forced:!i||!o},{map:function(t){return n(this,t,arguments.length>1?arguments[1]:void 0)}})},ddc3:function(t,e,c){},f567:function(t,e,c){"use strict";c("3298")}}]);
//# sourceMappingURL=cartList.327c985c.js.map