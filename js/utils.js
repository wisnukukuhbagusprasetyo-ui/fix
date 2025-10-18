export function driveUrlToDirect(urlOrId){
  if(!urlOrId) return '';
  if(/^[a-zA-Z0-9_-]{10,}$/.test(urlOrId)) return `https://drive.google.com/uc?id=${urlOrId}`;
  const patterns=[/https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{10,})/,/https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]{10,})/,/https?:\/\/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]{10,})/];
  for(const re of patterns){ const m=urlOrId.match(re); if(m) return `https://drive.google.com/uc?id=${m[1]}`; }
  return urlOrId;
}
export function formatDateISO(d){ try{ return new Date(d).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'}); }catch(e){return d;} }