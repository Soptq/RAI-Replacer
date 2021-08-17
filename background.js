const PREDEFINEDRULES = [
    [String.raw`(?:\d+(?:\.\d+)? )?USD`, String.raw`%p{:2}%sRAI`],
    [String.raw`(?:\d+(?:\.\d+)? )?US Dollar`, String.raw`%p%sRAI`],
    [String.raw`\$\d+`, String.raw`%p{:4}%sRAI`]
]

async function setSyncData(key, value) {
    let p = new Promise(function(resolve, reject){
        let obj = {}
        obj[key] = value
        chrome.storage.sync.set(obj, function(){
            resolve(true);
        })
    });
    return await p;
}

chrome.runtime.onInstalled.addListener(async (details) => {
    const currentVersion = chrome.runtime.getManifest().version
    const previousVersion = details.previousVersion
    const reason = details.reason

    // console.log('Previous Version: ${previousVersion }')
    // console.log('Current Version: ${currentVersion }')

    switch (reason) {
        case 'install':
            const datasets = [];
            for (const rule of PREDEFINEDRULES) {
                datasets.push({id: datasets.length, regex: rule[0], replace: rule[1], enabled: true})
            }
            await setSyncData("rules", datasets);
            await setSyncData("filtered_url", [])
            break;
        case 'update':
            break;
        case 'chrome_update':
        case 'shared_module_update':
        default:
            break;
    }

})