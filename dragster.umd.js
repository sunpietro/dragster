!function(e,t){if("object"==typeof exports&&"object"==typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{var o=t();for(var r in o)("object"==typeof exports?exports:e)[r]=o[r]}}(window,(function(){return function(e){var t={};function o(r){if(t[r])return t[r].exports;var n=t[r]={i:r,l:!1,exports:{}};return e[r].call(n.exports,n,n.exports,o),n.l=!0,n.exports}return o.m=e,o.c=t,o.d=function(e,t,r){o.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},o.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.t=function(e,t){if(1&t&&(e=o(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(o.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var n in e)o.d(r,n,function(t){return e[t]}.bind(null,n));return r},o.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return o.d(t,"a",t),t},o.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},o.p="",o(o.s=1)}([function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),function(e){e.TOUCHSTART="touchstart",e.TOUCHMOVE="touchmove",e.TOUCHEND="touchend",e.MOUSEDOWN="mousedown",e.MOUSEMOVE="mousemove",e.MOUSEUP="mouseup"}(t.EDomEvent||(t.EDomEvent={})),function(e){e.TOP="top",e.BOTTOM="bottom"}(t.EVisualPosition||(t.EVisualPosition={}))},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0});const r=o(0),n=o(2),s=o(3),a=()=>{},d="dragster-drag-region",l="dragster-drop-placeholder";t.Dragster=function({elementSelector:e=".dragster-block",regionSelector:t=".dragster-region",dragHandleCssClass:o=!1,dragOnlyRegionCssClass:i="dragster-region--drag-only",replaceElements:c=!1,updateRegionsHeight:g=!0,minimumRegionHeight:p=60,onBeforeDragStart:m=a,onAfterDragStart:u=a,onBeforeDragMove:E=a,onAfterDragMove:h=a,onBeforeDragEnd:v=a,onAfterDragEnd:f=a,onAfterDragDrop:O=a,scrollWindowOnDrag:T=!1,cloneElements:b=!1,wrapDraggableElements:M=!0,shadowElementUnderMouse:P=!1}){const y=Math.floor(65536*(1+Math.random())).toString(16),D=(e,t)=>{const o=e.parentNode;if(o&&(!e.classList||!e.classList.contains(d)||e.classList.contains(i)))return t(e)?e:t(o)?o:D(o,t)},C=e=>{const t=document.createElement("div");return t.classList.add(...e),t.dataset.dragsterId=y,t},L=(e,t)=>{if(e&&e.parentNode){const o=M?e:e.nextSibling;e.parentNode.insertBefore(t,o)}},w=(e,t)=>{e&&e.parentNode&&e.parentNode.insertBefore(t,e)},B=()=>C(["dragster-draggable"]),U=()=>C([l]),S=e=>{[...document.getElementsByClassName(e)].forEach(e=>{e.dataset.dragsterId===y&&e.parentNode.removeChild(e)})},H=({element:e,eventName:t,regions:o})=>{t&&(o.forEach((function(e){e.removeEventListener(t,G.mousemove)})),document.body.removeEventListener(t,G.mousemove)),e&&e.classList.remove("is-dragging"),[...document.getElementsByClassName("dragster-draggable")].forEach(e=>{e.firstChild||e.parentNode.removeChild(e)}),S(l),S("dragster-temp"),A()},N=()=>{[...document.getElementsByClassName("dragster-replacable")].forEach(e=>e.classList.remove("dragster-replacable"))},V=()=>[...document.querySelectorAll(e)],I=()=>[...document.querySelectorAll(t)],R=e=>{!1!==M?e.forEach(e=>{const t=e.parentNode;if(t.classList.contains("dragster-draggable"))return;const o=B();t.insertBefore(o,e),t.removeChild(e),o.appendChild(e)}):console.warn("You have disabled the default behavior of wrapping the draggable elements. If you want Dragster.js to work properly you still will have to do this manually.\n\nMore info: https://github.com/sunpietro/dragster/blob/master/README.md#user-content-wrapdraggableelements---boolean")},A=()=>{if(!g)return;[...document.getElementsByClassName(d)].forEach(t=>{const o=[...t.querySelectorAll(e)];if(!o.length)return;let r=p;o.forEach(e=>{const t=window.getComputedStyle(e);r+=e.offsetHeight+parseInt(t.marginTop,10)+parseInt(t.marginBottom,10)}),t.style.height=r+"px"})},x=e=>e.classList&&e.classList.contains("dragster-draggable")&&e.dataset.dragsterId===y,j=e=>e.classList&&e.classList.contains(i),_=(e,t,o)=>{H({element:z,eventName:e,regions:o}),H({element:z,eventName:t,regions:o})},Y=()=>{ee=window.innerHeight},W=e=>{e.forEach(e=>{e.classList.add(d),e.dataset.dragsterId=y,e.addEventListener(r.EDomEvent.MOUSEDOWN,G.mousedown,!1),e.addEventListener(r.EDomEvent.TOUCHSTART,G.mousedown,!1)})},k=()=>{c?N():S(l)};let q,F,X,z,G,J,K,Q,Z,$={top:!1,bottom:!1},ee=window.innerHeight,te=V(),oe=I();return c&&document.body.appendChild(C(["dragster-is-hidden","dragster-temp-container"])),G={mousedown:e=>{const{which:t,changedTouches:n,type:s}=e,a=e.target;if(o&&("string"!=typeof o||!a.classList.contains(o)))return;if(!1===m(e)||3===t)return;if(e.preventDefault(),z=D(a,x),!z)return;const d=s===r.EDomEvent.TOUCHSTART,l=n?n[0]:e,i=d?r.EDomEvent.TOUCHMOVE:r.EDomEvent.MOUSEMOVE,c=d?r.EDomEvent.TOUCHEND:r.EDomEvent.MOUSEUP,{mousemove:g,mouseup:p}=G;oe.forEach(e=>{e.addEventListener(i,g,!1),e.addEventListener(c,p,!1)}),document.body.addEventListener(i,g,!1),document.body.addEventListener(c,p,!1);const E=z.getBoundingClientRect();Q=E.left-l.clientX,Z=E.top-l.clientY,F=(()=>{const e=C(["dragster-temp","dragster-is-hidden"]);return e.style.position="fixed",document.body.appendChild(e),e})(),F.innerHTML=z.innerHTML,F.style.width=E.width+"px",F.style.height=E.height+"px",F.dataset.dragsterId=y,X=F.getBoundingClientRect(),z.classList.add("is-dragging"),q={drag:{node:z},drop:{node:null},shadow:{node:F,top:null,left:null},placeholder:{node:null,position:null},dropped:null,clonedFrom:null,clonedTo:null},e.dragster=q,u(e)},mousemove:e=>{if(e.dragster=q,!1===E(e)||!X)return;e.preventDefault();const t=e.changedTouches?e.changedTouches.item(0):e,{view:o,clientX:r,clientY:n}=t,a=o?o.pageXOffset:0,g=o?o.pageYOffset:0,p=n+g,m=r+a,u=document.elementFromPoint(r,n),v=D(u,x),f=P?n+Z:n,O=P?m+Q:m-X.width/2,b=q.drag.node&&q.drag.node.dataset,M=!(!v||!D(v,j)),C=u.dataset.dragsterId===y,L=u.classList.contains(d)&&C,B=u.classList.contains(i)&&C,S=u.classList.contains(l),H=u.getElementsByClassName("dragster-draggable").length>0,V=u.getElementsByClassName(l).length>0;clearTimeout(J),F.style.top=f+"px",F.style.left=O+"px",F.classList.remove("dragster-is-hidden"),q.shadow.top=f,q.shadow.left=O;const I=v&&v!==z&&!M,R=L&&!B&&!H&&!V,_=L&&!B&&H&&!V;!b&&!L&&!S?k():I?(k(),N(),q=s.addPlaceholderOnTargetOnMove({dropTarget:v,elementPositionY:p,pageYOffset:g,placeholder:U(),shouldReplaceElements:c,dragsterEventInfo:q,removePlaceholders:k,cssReplacableClass:"dragster-replacable",insertBefore:w,visiblePlaceholder:$})):R?(k(),q=s.addPlaceholderInRegionOnMove({target:u,placeholder:U(),dragsterEventInfo:q})):_&&(k(),q=s.addPlaceholderInRegionBelowTargetsOnMove({target:u,placeholder:U(),dragsterEventInfo:q,cssDraggableClass:"dragster-draggable",dragsterId:y})),T&&(e=>{const{changedTouches:t}=e,o=(t?t[0]:e).clientY;ee-o<60?window.scrollBy(0,10):o<60&&window.scrollBy(0,-10)})(e),A(),h(e)},mouseup:e=>{e.dragster=q;const t=e.type===r.EDomEvent.TOUCHSTART,o=t?r.EDomEvent.TOUCHMOVE:r.EDomEvent.MOUSEMOVE,s=t?r.EDomEvent.TOUCHEND:r.EDomEvent.MOUSEUP;if(!1===v(e))return void _(o,s,oe);const a=c?"dragster-replacable":l,d=document.getElementsByClassName(a)[0],i=!(!z||!D(z,j)),g=b&&i;if(J=setTimeout(()=>_(o,s,oe),200),N(),!z||!d)return void _(o,s,oe);let p=D(d,x);p=p||d,z!==p&&(c||g?c&&!g?(e.dragster=n.replaceElementsOnDrop({dragsterEvent:e.dragster,dropDraggableTarget:p,dropTemp:document.getElementsByClassName("dragster-temp-container")[0],draggedElement:z}),O(e)):!c&&g&&(e.dragster=n.cloneElementsOnDrop({dragsterEvent:e.dragster,dropTarget:d,insertAfterTarget:e=>{L(p,e)},insertBeforeTarget:e=>{w(p,e)},draggedElement:z,cleanWorkspace:e=>H({element:e,regions:oe})}),O(e)):(e.dragster=n.moveElementOnDrop({shouldWrapElements:!0===M,dragsterEvent:e.dragster,insertBefore:w,insertAfter:L,draggedElement:z,dropTarget:d,dropDraggableTarget:p,dropTemp:!1===M?z:B()}),O(e)),p.classList.remove("is-drag-over")),_(o,s,oe),f(e)}},K={addPlaceholderOnTarget:(e,t,o)=>{const n=e.getBoundingClientRect(),s=U(),a=n.height/2;N(),c?e.classList.add("dragster-replacable"):t-o-n.top<a&&!$.top?(S(l),s.dataset.placeholderPosition=r.EVisualPosition.TOP,w(e.firstChild,s),q.placeholder.position=r.EVisualPosition.TOP):n.bottom-(t-o)<a&&!$.bottom&&(S(l),s.dataset.placeholderPosition=r.EVisualPosition.BOTTOM,e.appendChild(s),q.placeholder.position=r.EVisualPosition.BOTTOM),q.placeholder.node=s,q.drop.node=e},addPlaceholderInRegion:e=>{const t=U();e.appendChild(t),q.placeholder.position=r.EVisualPosition.BOTTOM,q.placeholder.node=t,q.drop.node=e},addPlaceholderInRegionBelowTargets:e=>{const t=[...e.getElementsByClassName("dragster-draggable")].filter(e=>e.dataset.dragsterId===y),o=t[t.length-1],n=U();n.dataset.placeholderPosition=r.EVisualPosition.BOTTOM,S(l),o.appendChild(n),q.placeholder.position=r.EVisualPosition.BOTTOM,q.placeholder.node=n,q.drop.node=o},removePlaceholders:()=>{c?N():S(l)}},R(te),W(oe),window.addEventListener("resize",Y,!1),{update:()=>{te=V(),R(te),A(),Y()},updateRegions:()=>{oe=I(),W(oe)},destroy:()=>{oe.forEach(e=>{e.classList.remove(d),e.removeEventListener(r.EDomEvent.MOUSEDOWN,G.mousedown),e.removeEventListener(r.EDomEvent.MOUSEMOVE,G.mousemove),e.removeEventListener(r.EDomEvent.MOUSEUP,G.mouseup),e.removeEventListener(r.EDomEvent.TOUCHSTART,G.mousedown),e.removeEventListener(r.EDomEvent.TOUCHMOVE,G.mousemove),e.removeEventListener(r.EDomEvent.TOUCHEND,G.mouseup)}),document.body.removeEventListener(r.EDomEvent.MOUSEMOVE,G.mousemove),document.body.removeEventListener(r.EDomEvent.TOUCHMOVE,G.mousemove),document.body.removeEventListener(r.EDomEvent.MOUSEUP,G.mouseup),document.body.removeEventListener(r.EDomEvent.TOUCHEND,G.mouseup),window.removeEventListener("resize",Y)}}}},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0});const r=o(0);t.moveElementOnDrop=({dragsterEvent:e,dropTarget:t,dropDraggableTarget:o,dropTemp:n,insertBefore:s,insertAfter:a,shouldWrapElements:d,draggedElement:l})=>(t.dataset.placeholderPosition===r.EVisualPosition.TOP?s(o,n):d?a(o,n):a(n,o),l.firstChild&&d&&n.appendChild(l.firstChild),e.dropped=n,e),t.replaceElementsOnDrop=({dragsterEvent:e,dropDraggableTarget:t,dropTemp:o,draggedElement:r})=>(o.innerHTML=r.innerHTML,r.innerHTML=t.innerHTML,t.innerHTML=o.innerHTML,o.innerHTML="",e.dropped=o,e),t.cloneElementsOnDrop=({dragsterEvent:e,dropTarget:t,draggedElement:o,insertBeforeTarget:n,insertAfterTarget:s,cleanWorkspace:a})=>{const d=o.cloneNode(!0);return t.dataset.placeholderPosition===r.EVisualPosition.TOP?n(d):s(d),a(d),e.clonedFrom=o,e.clonedTo=d,e}},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0});const r=o(0);t.addPlaceholderOnTargetOnMove=({dropTarget:e,elementPositionY:t,pageYOffset:o,placeholder:n,dragsterEventInfo:s,shouldReplaceElements:a,removePlaceholders:d,cssReplacableClass:l,insertBefore:i,visiblePlaceholder:c})=>{const g=e.getBoundingClientRect(),p=g.height/2;return a?(e.classList.add(l),s.placeholder.node=n,s.drop.node=e,s):(t-o-g.top<p&&!c.top?(d(),n.dataset.placeholderPosition=r.EVisualPosition.TOP,i(e.firstChild,n),s.placeholder.position=r.EVisualPosition.TOP):g.bottom-(t-o)<p&&!c.bottom&&(d(),n.dataset.placeholderPosition=r.EVisualPosition.BOTTOM,e.appendChild(n),s.placeholder.position=r.EVisualPosition.BOTTOM),s.placeholder.node=n,s.drop.node=e,s)},t.addPlaceholderInRegionOnMove=({target:e,placeholder:t,dragsterEventInfo:o})=>(e.appendChild(t),o.placeholder.position=r.EVisualPosition.BOTTOM,o.placeholder.node=t,o.drop.node=e,o),t.addPlaceholderInRegionBelowTargetsOnMove=({target:e,dragsterEventInfo:t,placeholder:o,cssDraggableClass:n,dragsterId:s})=>{const a=[...e.getElementsByClassName(n)].filter(e=>e.dataset.dragsterId===s),d=a[a.length-1];return o.dataset.placeholderPosition=r.EVisualPosition.BOTTOM,d.appendChild(o),t.placeholder.position=r.EVisualPosition.BOTTOM,t.placeholder.node=o,t.drop.node=d,t}}])}));