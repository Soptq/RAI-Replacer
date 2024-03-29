let mainToggle = document.getElementById("main-toggle"),
    ruleTable = document.getElementById("rule-table"),
    headerTitle = document.getElementById("header-title"),
    inputRegex = document.getElementById("input-regex"),
    inputReplace = document.getElementById("input-replace"),
    inputBtnConfirm = document.getElementById("btn-confirm-rule"),
    manualReplaceBtn = document.getElementById("btn-manual-replace"),
    filterBtn = document.getElementById("btn-filter");

async function getSyncData(key) {
  let p = new Promise(function(resolve, reject){
    chrome.storage.sync.get(key, function(value){
      resolve(value[key]);
    })
  });
  return await p;
}

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

async function getRuleDataset() {
  return await getSyncData("rules")
}

async function setRuleDataset(dataset) {
  return await setSyncData("rules", dataset)
}

async function addRuleDataset(regex, replace) {
  let dataset = await getRuleDataset();
  let d = {id: dataset.length, regex: regex, replace: replace, enabled: true};
  dataset.push(d);
  await setRuleDataset(dataset);
  return d;
}

async function editRuleDataset(nid, regex, replace) {
  let dataset = await getRuleDataset();
  dataset.forEach((d) => {
    if (d.id === nid) {
      d.regex = regex;
      d.replace = replace;
    }
  })
  await setRuleDataset(dataset);
}

async function deleteRuleDataset(nid) {
  let dataset = await getRuleDataset();
  dataset = dataset.filter(function (obj) {
    return obj.id !== nid;
  });
  dataset.forEach((d) => {
    if (d.id > nid) {
      d.id--;
    }
  })
  await setRuleDataset(dataset);
}

async function uprankRuleDataset(nid) {
  if (nid === 0) return;
  let dataset = await getRuleDataset();
  dataset.forEach((d) => {
    if (d.id === (nid - 1)) {
      d.id++;
    } else if (d.id === nid) {
      d.id--;
    }
  })
  await setRuleDataset(dataset);
}

async function downrankRuleDataset(nid) {
  let dataset = await getRuleDataset();
  if (nid === (dataset.length - 1)) return;
  dataset.forEach((d) => {
    if (d.id === (nid + 1)) {
      d.id--;
    } else if (d.id === nid) {
      d.id++;
    }
  })
  await setRuleDataset(dataset);
}

async function setEnabledRuleDataset(nid, enabled) {
  let dataset = await getRuleDataset();
  dataset.forEach((d) => {
    if (d.id === nid) {
      d.enabled = enabled;
    }
  })
  await setRuleDataset(dataset);
}

function resetHeaderTitle(replaceCount = 0) {
  let title = "Checking...";
  headerTitle.innerHTML = title;
  chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
    const filteredUrls = await getSyncData("filtered_url");
    if (filteredUrls.includes(tabs[0].url)) {
      title = "Stopped, This Webpage is Filtered!";
      filterBtn.setAttribute("data-state", "unfilter");
      filterBtn.innerText = "Un-filter This Webpage";
    } else {
      if (mainToggle.checked) {
        if (replaceCount > 0) {
          title = `Running, Replaced <code>${replaceCount}</code> USDs on Current Page!`;
        } else {
          title = `RAI Replacer is Running`;
        }
      } else {
        title = "RAI Replacer is Disabled";
      }
      filterBtn.setAttribute("data-state", "filter");
      filterBtn.innerText = "Filter This Webpage";
    }
    headerTitle.innerHTML = title;
  });
}

function addRowToTable(tbody, d) {
  let newRow = tbody.insertRow(tbody.rows.length),
      enabled = d.enabled, checkedStr = "";
  if (enabled) {
    checkedStr = `checked="checked"`;
  }
  newRow.innerHTML = `
    <td class="td-enable" id="td-enable-${d.id}" data-id="${d.id}"><label class="container-checkbox"><input type="checkbox" id="td-checker-${d.id}" ${checkedStr}><span class="checkmark"></span></label></td>
    <td class="td-regex" title="${d.regex}" id="td-regex-${d.id}" data-id="${d.id}"><code>${d.regex}</code></td>
    <td class="td-icon" id="td-icon-${d.id}" data-id="${d.id}"><b><span>&#8594;</span></b></td>
    <td class="td-replace" title="${d.replace}" id="td-replace-${d.id}" data-id="${d.id}"><code>${d.replace}</code></td>
    <td class="td-edit" id="td-edit-${d.id}" data-id="${d.id}"><span>&#9998;</span></td>
    <td class="td-delete" id="td-delete-${d.id}" data-id="${d.id}"><span>&#128465;</span></td>
    <td class="td-up" id="td-up-${d.id}" data-id="${d.id}"><span>&#x2191;</span></td>
    <td class="td-down" id="td-down-${d.id}" data-id="${d.id}"><span>&#x2193;</span></td>
  `

  document.getElementById(`td-checker-${d.id}`).addEventListener("change", function (event) {
    setEnabledRule(event.target);
  })

  document.getElementById(`td-delete-${d.id}`).addEventListener("click", function (event) {
    deleteRule(event.target);
  })

  document.getElementById(`td-edit-${d.id}`).addEventListener("click", function (event) {
    editRule(event.target);
  })

  document.getElementById(`td-up-${d.id}`).addEventListener("click", function (event) {
    uprankRule(event.target);
  })

  document.getElementById(`td-down-${d.id}`).addEventListener("click", function (event) {
    downrankRule(event.target);
  })
}

function updateTable(dataset) {
  dataset.sort((a, b) => (a.id > b.id) ? 1 : -1);
  let tbody = ruleTable.getElementsByTagName("tbody")[0];
  tbody.innerHTML = "";
  dataset.forEach((d) => {
    addRowToTable(tbody, d);
  })
}

async function setEnabledRule(o) {
  debugger
  let nid = parseInt(o.parentNode.parentNode.getAttribute("data-id"));
  await setEnabledRuleDataset(nid, o.checked);
  updateTable(await getRuleDataset());
}

async function deleteRule(o) {
  let nid = parseInt(o.parentNode.getAttribute("data-id"));
  await deleteRuleDataset(nid);
  updateTable(await getRuleDataset())
}

async function editRule(o) {
  let nid = parseInt(o.parentNode.getAttribute("data-id"));
  let d = (await getRuleDataset()).filter((obj) => {return obj.id === nid})[0];
  inputRegex.value = d.regex;
  inputReplace.value = d.replace;
  inputBtnConfirm.setAttribute("data-state", "edit");
  inputBtnConfirm.setAttribute("data-edit-id", `${nid}`);
  inputBtnConfirm.innerText = "Confirm Changes";
}

async function uprankRule(o) {
  let nid = parseInt(o.parentNode.getAttribute("data-id"));
  await uprankRuleDataset(nid);
  updateTable(await getRuleDataset());
}

async function downrankRule(o) {
  let nid = parseInt(o.parentNode.getAttribute("data-id"));
  await downrankRuleDataset(nid);
  updateTable(await getRuleDataset());
}

async function ruleConfirm(o) {
  let state = o.getAttribute("data-state");
  if (state === "add") {
    let regex = String.raw`${inputRegex.value}`,
        replace = String.raw`${inputReplace.value}`;
    await addRuleDataset(regex, replace);
    updateTable(await getRuleDataset())
  } else if (state === "edit") {
    let nid = parseInt(o.getAttribute("data-edit-id")),
        regex = String.raw`${inputRegex.value}`,
        replace = String.raw`${inputReplace.value}`;
    await editRuleDataset(nid, regex, replace);
    updateTable(await getRuleDataset());
    o.setAttribute("data-state", "add");
    o.innerText = "Confirm Adding";
  }
  inputRegex.value = "";
  inputReplace.value = "";
}

async function filterCurrentPage(o) {
  let state = o.getAttribute("data-state");
  chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
    let filteredUrls = await getSyncData("filtered_url");
    if (state === "filter") {
      if (filteredUrls.includes(tabs[0].url)) {
        return
      }
      filteredUrls.push(tabs[0].url);
      await setSyncData("filtered_url", filteredUrls);
      o.setAttribute("data-state", "unfilter");
      o.innerText = "Un-filter This Webpage";
    } else if (state === "unfilter") {
      if (!filteredUrls.includes(tabs[0].url)) {
        return
      }
      filteredUrls = filteredUrls.filter((obj) => {return obj !== tabs[0].url});
      await setSyncData("filtered_url", filteredUrls);
      o.setAttribute("data-state", "filter");
      o.innerText = "Filter This Webpage";
    }
  });
}

async function main() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {command: "popupOpened"}, function(response) {
      resetHeaderTitle(parseInt(response.replaceCount));
    });
  });

  mainToggle.addEventListener("change", () => {
    chrome.storage.sync.set({'disabled': !mainToggle.checked}, () => {})
    resetHeaderTitle();
  });

  filterBtn.addEventListener("click", (event) => {
    filterCurrentPage(event.target);
  })

  inputBtnConfirm.addEventListener("click", (event) => {
    ruleConfirm(event.target);
  })

  manualReplaceBtn.addEventListener('click', function () {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {command: "replace"}, function(response) {console.log(response)});
    });
  }, false);

  mainToggle.checked = !(await getSyncData("disabled"));
  resetHeaderTitle();
  updateTable(await getRuleDataset());
}

main();
