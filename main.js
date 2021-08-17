let replaceCount = 0;

async function queryPrice() {
  let res = await axios.post("https://api.thegraph.com/subgraphs/name/reflexer-labs/rai-mainnet", {
    query: `
    {
      redemptionPrices(first: 1, orderBy: block, orderDirection: desc) {
        value
      }
    }
    `
  })

  return parseFloat(res.data.data.redemptionPrices[0].value)
}

function walk(el, fn) {
  let count = 0;
  for (let i = 0, len = el.childNodes.length; i < len; i++) {
    let node = el.childNodes[i];
    if (node.nodeType === 3)
      count += fn(node);
    else if (node.nodeType === 1 && node.nodeName !== "SCRIPT")
      count += walk(node, fn);
  }
  return count
}

function textNode(txt) {
  return document.createTextNode(txt);
}

function parse(str) {
  debugger
  let args = [].slice.call(arguments, 1),
      i = 0, pRegex = /%p(?:{:(\d+)})?/ig;
  if (args != null && args.length > 0) {
    let num = args[0], m, numList = [];
    while ((m = pRegex.exec(str)) !== null) {
      if (m.index === pRegex.lastIndex) {
        pRegex.lastIndex++;
      }
      m.forEach((match, groupIndex) => {
        if (match === undefined) {
          numList.push(num.toFixed(3));
        } else {
          if (!match.startsWith("%")) {
            numList.push(num.toFixed(parseInt(match)));
          }
        }
      });
    }
    return str.replace(pRegex, () => numList[i++].toString()).replace(/%s/g, " ");
  } else {
    return str.replace(pRegex, "").replace(/%s/g, "");
  }
}

function regexExtractAndReplace(text, rule, price) {
  let m, extractedList = [];
  while ((m = rule[0].exec(text)) !== null) {
    if (m.index === rule[0].lastIndex) {
      rule[0].lastIndex++;
    }
    m.forEach((match, groupIndex) => {
      let numMatched = match.match(/\d+(?:\.\d+)?/ig);
      if (numMatched == null || numMatched.length < 0) {
        extractedList.push(parse(rule[1]))
      } else {
        let num = (parseFloat(numMatched[0]) / price);
        extractedList.push(parse(rule[1], num));
      }
    })
  }
  return extractedList
}

function ruleReplace(rule, redemptionPrice) {
  return walk(document.body, function(node) {
    let text = node.data.split(rule[0]),
        extractedText = regexExtractAndReplace(node.data, rule, redemptionPrice),
        parent = node.parentNode,
        i = 1, e = 0, newNode;
    parent.insertBefore(textNode(text[0]), node);
    for (; i < text.length; i += 1) {
      (newNode = document.createElement("b"))
          .appendChild(textNode(extractedText[e++]));
      parent.insertBefore(newNode, node);
      parent.insertBefore(textNode(text[i]), node);
    }
    parent.removeChild(node);
    return extractedText.length
  });
}

async function fullPageReplace() {
  let redemptionPrice = await queryPrice();
  replaceCount = 0;
  chrome.storage.sync.get("rules", function(value){
    let dataset = value.rules;
    dataset.sort((a, b) => (a.id > b.id) ? 1 : -1);
    for (const d of dataset) {
      if (!d.enabled) {
        continue;
      }
      const rule = [new RegExp(d.regex, "ig"), d.replace]
      replaceCount += ruleReplace(rule, redemptionPrice);
    }
  })
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.command === "replace") {
        fullPageReplace();
        sendResponse({execute: true});
      } else if (request.command === "popupOpened") {
        sendResponse({replaceCount: replaceCount});
      } else {
        sendResponse({execute: false});
      }
    }
);

(async function () {
  chrome.storage.sync.get('disabled', function(value) {
    if (!value.disabled) {
      fullPageReplace()
    }
  });
})()
