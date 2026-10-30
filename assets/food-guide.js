/* Editorial food guide; original records, filtering and persisted IDs stay authoritative. */
(()=>{
 const root=document.getElementById('view-food');if(!root)return;
 const $f=id=>document.getElementById(id),byId=new Map(DATA.foods.map(item=>[item.id,item]));
 const featured=[
  {id:'food-5',title:'子午路张记肉夹馍',branch:'翠华路店',time:'10.29 16:45 · 出馆后',dishes:'肉夹馍 · 凉皮',address:'翠华路挚友大厦一层',image:'roujiamo',alt:'肉夹馍与凉皮菜品意象'},
  {id:'food-23',title:'惠记粉汤羊血',branch:'西安大悦城店',time:'10.31 18:00 · 夜游前',dishes:'粉汤羊血',address:'慈恩西路69号 · 大悦城B1-95',image:'yangxue',alt:'粉汤羊血菜品意象'}
 ];
 let wasDefault=null,filterIntent=false;
 const icon=(name,cls='')=>'<img class="'+cls+'" src="assets/icons/'+name+'.svg" alt="" aria-hidden="true">';
 function bookmark(item,location){const marked=!!state.favorites[item.id];return '<button type="button" class="food-bookmark" data-food-save="'+item.id+'" data-food-location="'+location+'" aria-pressed="'+marked+'" aria-label="'+(marked?'取消收藏':'收藏')+' '+esc(item.name)+'">'+icon(marked?'bookmark-simple-fill':'bookmark-simple')+'</button>'}
 function navigation(item){return mapURL(textOf(item.name)+' '+textOf(item.address).split('；')[0])}
 function details(item){return '<details class="food-evidence"><summary>地址、点单与来源</summary><div><p><strong>推荐菜</strong> '+item.dishes+'</p><p><strong>地址</strong> '+item.address+'</p>'+(item.advice?'<p>'+item.advice+'</p>':'')+(item.evidence?'<p>'+item.evidence+'</p>':'')+'<p class="food-record-type">'+esc(item.type+(item.category?' · '+item.category:''))+'</p></div></details>'}
 function featuredCard(config,i){const item=byId.get(config.id);return '<article class="food-card" data-featured-food="'+item.id+'"><div class="food-photo"><img src="assets/food/'+config.image+'.webp" alt="AI 菜品意象，非门店实拍：'+config.alt+'" width="960" height="640" decoding="async"><span>菜品意象 · 非实拍</span><p class="food-image-fallback" hidden>菜品图片暂不可用</p></div><div class="food-card-line"><p class="food-meal-time">'+config.time+'</p>'+bookmark(item,'featured')+'</div><h3>'+config.title+'</h3><p class="food-branch">'+config.branch+'</p><p class="food-card-dishes">'+config.dishes+'</p><p class="food-card-address">'+icon('map-pin')+'<span>'+config.address+'</span></p><a class="food-navigate '+(i===0?'food-navigate-primary':'')+'" href="'+navigation(item)+'" target="_blank" rel="noopener noreferrer">导航到店 '+icon('arrow-right')+'</a>'+details(item)+'</article>'}
 function resultRow(item){return '<article class="food-list-row" data-food-result="'+item.id+'"><div class="food-list-heading"><h3>'+esc(item.name)+'</h3>'+bookmark(item,'result')+'</div><p class="food-list-dishes">'+item.dishes+'</p><p class="food-list-address">'+item.address+'</p>'+(item.advice?'<div class="food-list-advice">'+item.advice+'</div>':'')+(item.evidence?'<p class="food-list-evidence">'+item.evidence+'</p>':'')+'<div class="food-list-footer"><span>'+esc(item.type+(item.category?' · '+item.category:''))+'</span><a href="'+navigation(item)+'" target="_blank" rel="noopener noreferrer">查找地点 '+icon('arrow-right')+'</a></div></article>'}
 function renderGuide(){const q=$f('food-search').value.trim(),source=$f('food-source').value,category=$f('food-category').value,only=$f('favorite-only').checked;
  const normal=source==='路线餐馆'&&!q&&!category&&!only;
  const items=[...$f('food-body').querySelectorAll('[data-food]')].map(b=>byId.get(b.dataset.food));
  $f('food-featured').hidden=!normal;$f('food-featured-grid').innerHTML=normal?featured.map(featuredCard).join(''):'';
  root.querySelectorAll('[data-food-source]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.foodSource===source)));
  root.querySelectorAll('[data-food-category]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.foodCategory===category)));
  $f('food-results').innerHTML=items.map(resultRow).join('');
  $f('food-empty').innerHTML=only?'当前筛选下没有收藏。<button type="button" data-food-all-favorites>查看全部收藏</button>':'无匹配结果，请调整筛选。';
  $f('food-results-summary').textContent=(normal?'更多路线餐馆':'筛选结果')+' · '+items.length+'条记录';
  if(wasDefault!==normal)$f('food-results-details').open=!normal;wasDefault=normal;
  root.querySelectorAll('.food-photo>img').forEach(img=>{const failed=()=>{img.hidden=true;img.parentElement.classList.add('food-image-failed');img.parentElement.querySelector('.food-image-fallback').hidden=false};img.addEventListener('error',failed,{once:true});if(img.complete&&!img.naturalWidth)failed()});
 }
 const originalRenderFood=renderFood;renderFood=function(){originalRenderFood();renderGuide()};
 // Entering favorites from the default cross-list selection must include its saved meals.
 root.addEventListener('change',event=>{
  if(['food-source','food-category'].includes(event.target.id)&&event.isTrusted)filterIntent=true;
  if(event.target.id==='favorite-only'&&event.target.checked&&!filterIntent&&!$f('food-featured').hidden&&!$f('food-search').value.trim()&&!$f('food-category').value&&$f('food-source').value==='路线餐馆'){
   $f('food-source').value='全部记录';toast('已切换到全部记录，显示所有收藏');
  }
 },true);
 const categories=['小炒泡馍','酸汤水饺','手工麻食','凉皮'];$f('food-quick-categories').innerHTML=categories.map(name=>'<button type="button" data-food-category="'+name+'" aria-pressed="false">'+name+'</button>').join('')+'<button type="button" data-food-more>更多 '+icon('arrow-right')+'</button>';
 root.addEventListener('click',event=>{
  const source=event.target.closest('[data-food-source]');if(source){filterIntent=true;$f('food-source').value=source.dataset.foodSource;$f('food-source').dispatchEvent(new Event('change'));return}
  const category=event.target.closest('[data-food-category]');if(category){filterIntent=true;$f('food-category').value=category.dataset.foodCategory;$f('food-category').dispatchEvent(new Event('change'));return}
  if(event.target.closest('[data-food-more]')){filterIntent=true;$f('food-source').value='九类备选';$f('food-source').dispatchEvent(new Event('change'));$f('food-category').focus();return}
  if(event.target.closest('[data-food-all-favorites]')){filterIntent=true;$f('food-source').value='全部记录';$f('food-category').value='';$f('food-search').value='';$f('favorite-only').checked=true;renderFood();$f('favorite-only').focus();return}
  const button=event.target.closest('[data-food-save]');if(!button)return;const id=button.dataset.foodSave,location=button.dataset.foodLocation;
  state.favorites[id]=!state.favorites[id];save();renderFood();
  const next=root.querySelector('[data-food-save="'+id+'"][data-food-location="'+location+'"]');(next||$f('food-search')).focus();
 });
 renderGuide();
})();
