let dateItems = {};
let today = new Date();
today.setDate(today.getDate() - 365);

for (let i=0; i<365; i++) {
    today.setDate(today.getDate()+1);
    if (!dateItems[today.toLocaleDateString()]) {
        dateItems[today.toLocaleDateString()] = {};
    }

    if (today.getDay() != 0 && today.getDay() != 6){
        let trend = Math.floor(Math.random()*3 + 1);
        
        if (trend > 2) {
            dateItems[today.toLocaleDateString()].trend= 'up';
            dateItems[today.toLocaleDateString()].balance = Math.floor(Math.random()*100+1);
        } else if (trend < 2) {
            dateItems[today.toLocaleDateString()].trend = 'down';
            dateItems[today.toLocaleDateString()].balance = Math.floor(Math.random()*100+1);
        }
    }

    if (i%5 === 0) {
        dateItems[today.toLocaleDateString()].hasAlert = true;
        dateItems[today.toLocaleDateString()].hasEvent = true;
    }

    if (i%8 === 0) {
        dateItems[today.toLocaleDateString()].hasTransfer = true;
        dateItems[today.toLocaleDateString()].hasEvent = true;
    }

    if (i%13 === 0) {
        dateItems[today.toLocaleDateString()].hasInvest = true;
        dateItems[today.toLocaleDateString()].hasEvent = true;
    }
}

const sortedEntries = Object.entries(dateItems).sort(([key1], [key2]) => { return new Date(key1) - new Date(key2) >0? 1: -1; });
dateItems = Object.fromEntries(sortedEntries);

document.querySelector('#calendar').innerHTML=`<harley-calendar class="showBalance showEvents showActivity" events='${JSON.stringify(dateItems)}'></harley-calendar>`;