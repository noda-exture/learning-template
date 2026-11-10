import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
export const normalizeEmail=value=>String(value||'').trim().toLowerCase();
export const validEmail=value=>value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const key=await derive(password,salt,64);return salt+':'+key.toString('hex');}
export async function verifyPassword(password,encoded){if(typeof password!=='string'||password.length>128)return false;const [salt,hex]=String(encoded||'').split(':');if(!salt||!hex)return false;const expected=Buffer.from(hex,'hex');const actual=await derive(password,salt,64);return expected.length===actual.length&&timingSafeEqual(expected,actual);}
export const memberFields=['profile','favorites','orders'];
export function hydrateMember(state,account){for(const key of memberFields)state[key]=structuredClone(account[key]??(key==='profile'?{}:[]));state.user={id:account.id,name:account.profile.name};}
export function publicState(state){const {registration,...safe}=state;return{...safe,registration:registration&&registration.expires>Date.now()?{name:registration.name,email:registration.email,token:registration.token}:null};}
