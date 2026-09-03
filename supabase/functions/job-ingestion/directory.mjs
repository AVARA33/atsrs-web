// No AI inference: a personal posting contact must occur in both public source and page.
export function postingContact(detail, html) {
 const name=String(detail?.creator?.name||'').replace(/\s+/g,' ').trim();
 if(!name)return {name:null,state:'not_provided'};
 const valid=/^[\p{L}][\p{L}\p{M} .'’-]{2,119}$/u.test(name)&&name.split(' ').length>=2;
 const generic=/\b(team|recruitment|recruiting|resources|admin|support|careers|eurofins|experian|ncs)\b/i.test(name);
 const visible=String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
 return valid&&!generic&&visible.includes(name)?{name,state:'verified'}:{name:null,state:'review'};
}
