// request permission on page load
document.addEventListener('DOMContentLoaded', function() {
  if (!Notification) {
   alert('Desktop notifications not available in your browser. Try Chromium.');
   return;
  }
 
  if (Notification.permission !== 'granted')
   Notification.requestPermission();
});
 
 
function notifyMe(title, body) {
  if (Notification.permission !== 'granted')
    Notification.requestPermission();
  else {
    var notification = new Notification(title, {
    icon: 'http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png',
    body: body,
    });
    notification.onclick = function() {
    window.open('http://stackoverflow.com/a/13328397/1269037');
    };
  }
}

const interval = setInterval(function() { 
    let data = [ 
      {label: 'nvl', values: [],                                   sell: [{p:13.1, b: 12.9},{p:11.55, b: 11.4}], view: true}, 
      {label: 'mbb', values: [],                                   sell: [], view: false},
      {label: 'dxg', values: [],                                   sell: [{p:15.85, b: 14.67},{p:15.85, b: 17},{p:15.85, b: 14.75}], view: true}, 
      {label: 'ssi', values: [],                                   sell: [{p:33.5, b: 32.9},{p:31.45, b: 30.5},{p:32.85, b: 32.85}], view: true}, 
      {label: 'pdr', values: [],                                   sell: [{p:21.75, b: 21.1}], view: true},
      {label: 'tcb', values: [28.22,23.45,22.7,21.15],             sell: [], view: true}, 
      {label: 'vnd', values: [16.7,15.65,14.55],                   sell: [], view: true}, 
      {label: 'hsg', values: [22.9,19.75],                         sell: [], view: true}, 
      {label: 'nkg', values: [24.4,19.95],                         sell: [], view: true}, 
      {label: 'dig', values: [24.8,26.55,24.1],                    sell: [], view: true},
      {label: 'msn', values: [78.4],                               sell: [], view: true}, 
      {label: 'hpg', values: [25.65,25.90],                        sell: [], view: true}, 
      {label: 'hvn', values: [22.3],                               sell: [], view: true},
    ]; 

    var syms = data.map((item)=>{
      return item.label;
    });
    fetch('https://bgapidatafeed.vps.com.vn/getliststockdata/'+syms.join(","))
    .then(function (a) {
      return a.json();
    })
    .then(function (json) {
      console.log("***"+new Date()+"***");
      var summary = 0;
      var profit = 0;
      var result = json.map((item, index)=>{
        if(data[index].view){
          var s = item.sym + "(" + data[index].values.join(",") + ") (" + item.r + " -> " + item.lastPrice + ") " + (item.r < item.lastPrice ? "(↑" : (item.r == item.lastPrice ?  "(" : "(↓")) + item.ot + ")"; 
          var total = 0;
          var d = data[index].values.map((dataValue)=>{
            var result = (item.lastPrice - dataValue) * 100;
            total = total + result;
            summary = summary + result;
            return ("" + result.toFixed(0)).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
          });
          if(d.length > 0){
            var totalstr = ("" + total.toFixed(0)).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
            s = s + "(" + d.join("+") + "=" + totalstr + ")";
          }else{
            s = s + "(View)";
          }
          
          data[index].sell.map((sellData)=>{
            profit = profit +  (sellData.p - sellData.b) * 100;
          });

          return {detail: s, total: total};
        }else{
          data[index].sell.map((sellData)=>{
            profit = profit +  (sellData.p - sellData.b) * 100;
          });
          return null;
        }
      }).filter(a => a!= null);
      result.sort(function(a, b){return a.total-b.total;});
      result.map((item)=>{console.log( item.detail);});
      console.log(">>>"+(""+summary.toFixed(0)).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')+"<<< >>>"+(profit.toFixed(0)).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,'))+"<<<";
      if(summary>500){
        notifyMe("Alert", `${summary.toFixed(0)}` );
      }
      if(summary<-3500){
        notifyMe("Alert ", `${summary.toFixed(0)}` );
      }
    })
}, 10000);
clearInterval(interval); 