import{j as i}from"./chakra-BWJEeLAN.js";import{a as s}from"./vendor-Bv6RL_Bi.js";import{JsonEditor as l}from"./jsonEditReact-C9N-1j_L.js";import{u as d,i as t,h as u,C as h,s as m,B as g,q as D,v as S,N as w,I as b,z as x,G as y,X as k,r as f,c as N,t as a,D as c}from"./index-BiI4JylO.js";import{S as T}from"./SearchBox-DkeLTdzu.js";import"./json-DTg2Cl9u.js";import"./icons-DMM-fQ09.js";const P={Intro:`# json-edit-react
  
  ## Custom Component library
  
  ### Components available:
  - Hyperlink
  - "Enhanced" link
  - DatePicker
  - DateObject
  - UNIX Timestamp
  - NumberFormatter
  - Undefined
  - Markdown
  - BigInt
  - BooleanToggle
  - NaN
  - Symbol
  - Image
  - ColorPicker

  Click [here](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/README.md) for more info
  `,"Active Links":{Url:"https://carlosnz.github.io/json-edit-react/","Long URL":"https://www.google.com/maps/place/Sky+Tower/@-36.8465603,174.7609398,818m/data=!3m1!1e3!4m6!3m5!1s0x6d0d47f06d4bdc25:0x2d1b5c380ad9387!8m2!3d-36.848448!4d174.762191!16zL20vMDFuNXM2?entry=ttu&g_ep=EgoyMDI1MDQwOS4wIKXMDSoASAFQAw%3D%3D","Enhanced Link":{text:"This link displays custom text — try editing me!",url:"https://github.com/CarlosNZ/json-edit-react/tree/main/packages/components"}},"Simple boolean toggle":!1,"Date & Time":{"Date Picker":new Date().toISOString(),"Date Object":new Date,"Show Time in Date?":!0,"Unix Timestamp (seconds)":Math.floor(Date.now()/1e3),"Unix Timestamp (ms)":Date.now(),"Show Unix as raw number?":!0},"Number Formatting":{locale:"en-US",millions:1234989,currency:1789.89,percent:.8756,units:2789.88,compact:12e5,rounded:1.3333333},"Non-JSON types":{Undefined:void 0,"Not a Number":NaN,Symbol1:Symbol("First one"),Symbol2:Symbol("Second one"),BigInt:1234567890123456789012345678901234567890n},Markdown:"Uses [react-markdown](https://www.npmjs.com/package/react-markdown) to render **Markdown** *text content*. ",Images:{JPG:"https://film-grab.com/wp-content/uploads/2014/07/51.jpg",PNG:"https://github.com/CarlosNZ/json-edit-react/blob/main/image/logo192.png?raw=true",GIF:"https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnV0aHB0c2xiMHFmdGY3Z2NkenBkb3Rmd3hvdTlkaTlkNGYxOXFtOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9E7kUhnT9eDok/giphy.gif","Image properties":{maxWidth:200,maxHeight:100}},"Color Picker":"#ff69B4"},U={enum:"Locale",values:["en-US","en-GB","de-DE","fr-FR","es-ES","it-IT","ja-JP","zh-CN","hi-IN","ar-EG","ru-RU","pt-BR"],matchPriority:1},E={"en-US":"USD","en-GB":"GBP","de-DE":"EUR","fr-FR":"EUR","es-ES":"EUR","it-IT":"EUR","ja-JP":"JPY","zh-CN":"CNY","hi-IN":"INR","ar-EG":"EGP","ru-RU":"RUB","pt-BR":"BRL"},I=n=>t("locale")(n)?[U]:!0,j=n=>{const o=n,e=o?.["Number Formatting"]?.locale??"en-US",r=E[e]??"USD";return[u({componentProps:{showTime:o?.["Date & Time"]?.["Show Time in Date?"]??!1}}),h({componentProps:{showTime:o?.["Date & Time"]?.["Show Time in Date?"]??!1,DatePicker:m}}),g({componentProps:{DatePicker:m,showTime:o?.["Date & Time"]?.["Show Time in Date?"]??!1,displayAs:o?.["Date & Time"]?.["Show Unix as raw number?"]??!0?"number":"date"}}),D({componentProps:{imageStyles:{maxHeight:o?.Images?.["Image properties"]?.maxHeight,maxWidth:o?.Images?.["Image properties"]?.maxWidth}}}),S(),w(),b(),x(),y(),k(),f(),N(),a({condition:t("millions"),componentProps:{locale:e}}),a({condition:t("currency"),componentProps:{locale:e,options:{style:"currency",currency:r}}}),a({condition:t("percent"),componentProps:{locale:e,options:{style:"percent",maximumFractionDigits:2}}}),a({condition:t("units"),componentProps:{locale:e,options:{style:"unit",unit:"kilometer"}}}),a({condition:t("compact"),componentProps:{locale:e,options:{notation:"compact"}}}),a({condition:t("rounded"),componentProps:{locale:e,options:{maximumFractionDigits:2}}}),c({condition:t("Markdown")}),c({condition:t("Intro"),showKey:!1,componentProps:{components:{a:({_:R,...p})=>i.jsx("a",{...p,target:"_blank",rel:"noopener noreferrer"})}}})]};function O(){const[n,o]=s.useState(P),[e,r]=s.useState("");return i.jsxs("div",{style:{position:"relative"},children:[i.jsx(T,{value:e,onChange:r,placeholder:"Search"}),i.jsx(l,{data:n,setData:o,...d(),rootName:"components",collapse:3,customNodeDefinitions:j(n),allowTypeSelection:I,searchText:e})]})}export{I as allowTypeSelection,j as customNodeDefinitions,O as default,P as initialData};
