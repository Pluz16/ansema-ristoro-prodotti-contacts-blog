// js/social.js — Deep link Storie IG + copia menzione + fallback
(function(){
  const btnStory  = document.getElementById('ig-story');
  const btnCopy   = document.getElementById('copy-mention');
  const mention   = btnCopy ? (btnCopy.dataset.mention || '@ansema') : '@ansema';
  const profile   = 'https://www.instagram.com/ansema';

  function showToast(msg){
    const t = document.createElement('div');
    t.className = 'toast';
    t.role = 'status';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>{ t.remove(); }, 1800);
  }

  // Apri fotocamera Storie (solo se app è installata)
  function openIGStory(){
    const deepLink = 'instagram://story-camera';
    // Fallback al profilo se lo schema non è gestito
    const timer = setTimeout(()=>{ window.open(profile, '_blank', 'noopener'); }, 1200);
    window.location.href = deepLink;
    // Se arriva qui con app aperta, il timer non blocca, l’utente resta in IG
  }

  // Copia menzione
  async function copyMention(){
    try{
      await navigator.clipboard.writeText(mention);
      showToast('Menzione copiata: ' + mention);
    }catch(e){
      showToast('Copia non riuscita. Seleziona manualmente: ' + mention);
    }
  }

  btnStory  && btnStory.addEventListener('click', openIGStory);
  btnCopy   && btnCopy.addEventListener('click', copyMention);
})();
