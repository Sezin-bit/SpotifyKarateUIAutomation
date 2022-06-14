if (typeof (_QTP) != 'undefined' || window._QTP) {
    (function () {
        var _QTP = this;
        _QTP.AutoXpathRecorder = function (srcElem) {
            function findImportentAncestor(elem) {
                // Find the first ancestor element that has some similar children we do that by checking edit 
                // distance of the children of each children.
                var calcFunctions = {  // JSON of objects that holds the similarity functions to check and the weight to give each one
                    domSimilarity: { func: calcDomSimilarity, weight: 1 }
                    //,alignSimilarity : { func:calcAlignSimilarity, weight : 0.75}
                }

                // Calculate similarity between 2 nodes using weighted average of similarity functions defined in calFunctions
                function calcSimilarity(node1, node2) {
                    var calcedSimilarty = 0, weight = 0;
                    for (var calcF in calcFunctions) {
                        var cf = calcFunctions[calcF];
                        if (cf.weight > 0) {
                            calcedSimilarty += cf.func(node1, node2);
                            weight += cf.weight;
                        }
                    }
                    return calcedSimilarty / weight;
                }

                // DOM similarity of subtrees of node1 and node2. We calculate it by adapting the string edit distance algorithm 
                // to check similarity of subtrees by comparing the children of the root of each subtree based on their HTML tag.
                function calcDomSimilarity(node1, node2) {
                    if (!areEqual(node1, node2)) return 0;
                    var list1 = node1.childNodes, list2 = node2.childNodes;
                    if (list1.length == 0 && list2.length == 0) return 0.5;
                    if (list1.length == 0 || list2.length == 0) return 0;
                    if (Math.abs(list1.length - list2.length) > 10) return 0;
                    if (list1.length > 5 || list2.length > 5) return 0;
                    return (1 - (calcEditDistance(list1, 0, list2, 0) / (list1.length + list2.length)));
                }

                // Edit distance of 2 lists - the minimal number of changes (additions,deletions) in the lists.
                function calcEditDistance(list1, index1, list2, index2) {
                    if (index1 + 1 >= list1.length) return list2.length - index2 - 1;
                    if (index2 + 1 >= list2.length) return list1.length - index1 - 1;

                    return areEqual(list1[index1], list2[index2]) ?
						calcEditDistance(list1, index1 + 1, list2, index2 + 1) :
						Math.min(calcEditDistance(list1, index1 + 1, list2, index2),
							calcEditDistance(list1, index1, list2, index2 + 1)) + 1;
                }

                function areEqual(elem1, elem2) {
                    try {
                        var role1 = elem1.getAttribute ? elem1.getAttribute("role") : "";
                        var role2 = elem2.getAttribute ? elem2.getAttribute("role") : "";
                        return (elem1.tagName == elem2.tagName) && (role1 == role2);
                    } catch (e) { return false; }
                }
                function calcAlignSimilarity(elem1, elem2) {
                    var rect1 = elem1.getBoundingClientRect(), rect2 = elem2.getBoundingClientRect(), score = 0;
                    if (rect1.left == rect2.left || rect1.right == rect2.right || rect1.top == rect2.top || rect1.bottom == rect2.bottom) {
                        score++;
                        if (rect1.right - rect1.left == rect2.right - rect2.left) score++;
                        if (rect1.bottom - rect1.top == rect2.bottom - rect2.top) score++;
                    }
                    return score / 3;
                }

                var bestGrade = 0, bestElem;
                while ((elem = elem.parentNode).parentNode) {
                    var grade = 1, siblings = 1;  // Here I state that I'm identical to myself. This helps overcome
                    // The problem of only 1 other sibling that will get a score of 0 or less
                    for (var curSibling = elem.parentNode.firstChild; curSibling; curSibling = curSibling.nextSibling) {
                        if (curSibling.nodeType != 1 || curSibling == elem) continue; // Process only sibling element nodes (nodeType == 1) except myself
                        /* Since that in object identification we don't look only for visible elements we need this to be unique. 
                           So the following code is disabled until further notice

                        if (curSibling.getBoundingClientRect) {
                            // Ignore invisible child elements since they are deem unimportant. FF 2.0 does not support getBoundingClientRect
                            // but we can live without this optimization.
                            var rect = curSibling.getBoundingClientRect();
                            if (rect.right - rect.left == 0) continue;
                        }
                        */
                        var g = calcSimilarity(elem, curSibling);
                        grade += g;
                        if (++siblings > 20) break;
                    }

                    if (siblings == 1) continue; // If I'm the only child I don't have matching siblings
                    grade = (grade / siblings) - (1 / (siblings * siblings)); // Give some advantage to having many siblings
                    Log("grade: " + grade);
                    if (grade > bestGrade) {
                        bestGrade = grade;
                        bestElem = elem;
                        if (bestGrade > 0.80) break;
                    }
                }
                Log("bestGrade: " + bestGrade);
                if (bestElem && bestGrade > 0.5) return bestElem;
            }

            // Make a quoted string for XPath we need to take care of situations where we have " in the 
            // string - we then use '.
            // There is still a limitation when the string contains both " and '
            function qouteString(srcText) {
                var qoutes = '"';
                if (/"/g.test(srcText)) {
                    if (/'/g.test(srcText)) {
                        return "";
                    }
                    qoutes = "'";
                }
                return qoutes + srcText + qoutes;
            }

            // check that there are no digits in the ID string
            function isStrongId(idString) {
                return !!idString && !/\d/.test(idString);
            }
	    
            // Evaluate the xpath even in IE where XPath is not supported.
            function evaluateXpath(xpath, context, resultType) {
                return _QTP.finder.xpath_evaluate(xpath,context,resultType);
            }
	    
            // Build top to bottom XPath in the form of src/e1/e2/dest adding requested 
            // predicates for each element on the way
            function xpathBuilder(srcElem, destElem, options, doc) {
                if (!destElem)
                    return "";
                var xpathString = "";
                var done = false;
                var nextE = srcElem;
                var textAdded = false;
                while (nextE && (nextE != destElem) && !done) {
                    var currentE = nextE;
                    nextE = currentE.parentNode;
                    // For elements not under the BODY tag we will get to nextE == null and we
                    // don't want XPath for them.
                    if (!nextE)
                        return "";
                    var nodeStr = currentE.tagName;
                    var predicate = "";
                    var nodeId = currentE.id;
                    // Consider ids without digits as strong Ids and stop on a strong ID.
                    if (isStrongId(nodeId)) {
                        predicate = "@id=\"" + nodeId + "\"";
                        done = true;
                    } else {
                        if (options & xpathBuilder.addRole) {
                            try {
                                var role = currentE.getAttribute ? currentE.getAttribute("role") : "";
                                if (role)
                                    predicate += "@role=\"" + role + "\"";
                            } catch (e) { }
                        }
                        if ((options & xpathBuilder.addText) && nextE != srcElem && destElem != doc.body) {
                            var result = evaluateXpath("text()", currentE, "STRING_TYPE");
                            var txt = result ? result.stringValue : "";
                            if (txt != "") {
                                var qoutedString = qouteString(txt);
                                if (qoutedString != "") {
                                    if (predicate != "")
                                        predicate += " and ";
                                    predicate += "text()=" + qoutedString;
                                }
                            }
                        }
                        if (!textAdded && (options & xpathBuilder.addNormalizedSpace)) {
                            // Add normalize-space() of current node (innerText normalized to ignore multiple spaces) when requested we add it 
                            // only if the text uniqifies the element or it is the destination element
                            // note: Text comparsion breaks browser compatability when the entity text contains &nsbp; IE will use space instead where
                            // FF will require the #160 charcter.
                            var result = evaluateXpath("normalize-space()", currentE, "STRING_TYPE");
                            var txt = result ? result.stringValue : "";
                            if (txt && txt.length > 0 && txt.length <= 20) {
                                var qoutedString = qouteString(txt);
                                if (qoutedString != "") {
                                    var newPredicate = predicate;
                                    if (newPredicate != "")
                                        newPredicate += " and ";
                                    newPredicate += "normalize-space()=" + qoutedString;
                                    if (nextE == destElem) {
                                        // We are at the top element add the text property
                                        predicate = newPredicate;
                                        textAdded = true;
                                    } else {
                                        // Check if the text will help uniquely identify the element
                                        var tempXpath = "//" + nodeStr + "[" + newPredicate + "]" + xpathString;
                                        var res = evaluateXpath(tempXpath, currentE, "ANY_TYPE");
                                        // I don't use res.snapshotLength since it throws in FF
                                        if (res && res.iterateNext) {
                                            var num = 0;
                                            while (res.iterateNext()) {
                                                if (++num > 1)
                                                    break;
                                            }
                                            if (num == 1) {
                                                predicate = newPredicate;
                                                textAdded = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (predicate != "")
                        nodeStr += "[" + predicate + "]";
                    if (!done && !textAdded && (options & xpathBuilder.addSpecifier)) {
                        var results = evaluateXpath(nodeStr, nextE, "ORDERED_NODE_ITERATOR_TYPE");
                        var i = 1;
                        var node;
                        while (results && (node = results.iterateNext())) {
                            // For FF4+, we need to use node.wrappedJSObject
                            if (node.wrappedJSObject == currentE || node == currentE) {
                                nodeStr += "[" + i + "]";
                                break;
                            }
                            i++;
                        }
                    }
                    xpathString = "/" + nodeStr + xpathString;
                }
                if (xpathString != "")
                    xpathString = "/" + xpathString;
                return xpathString;
            }

            // Check if the Xpath is unique. Unique means there's one and only one element with that XPath (not zero and not many)
            function isXpathUnique(xpath, doc) {
                var snapshotLength = 0;
                try {
                    snapshotLength = doc.evaluate(xpath, doc, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength;
                }
                catch (e) {
                    return false;
                }
                return snapshotLength === 1;
            };

            function Log(str) { }

            var doc = (typeof (GlobalNSResolver) != 'undefined') ? GlobalNSResolver.document : window.document;

            if (!doc.body.contains(srcElem))
                return; // In some cases a previous event handler removes the element before the QTP event handler gets to treat it, in these cases do nothing.

            xpathBuilder.addText = 1;
            xpathBuilder.addSpecifier = 2;
            xpathBuilder.addRole = 4;
            xpathBuilder.addNormalizedSpace = 8;

            // If Body elem - return the only XPath available
            if (srcElem === doc.body)
                return "//BODY";

            var endElem = findImportentAncestor(srcElem);
            if (endElem) {
                var xpathResult = xpathBuilder(srcElem, endElem.parentNode, xpathBuilder.addSpecifier | xpathBuilder.addRole | xpathBuilder.addNormalizedSpace, doc);
                // Make sure the whole xpath thingy is unique - otherwise we did a bunch of work for nothing
                if (isXpathUnique(xpathResult, doc))
                    return xpathResult;
                // else - fall through and calculate xpath the naive way
            }

            return xpathBuilder(srcElem, doc.body, xpathBuilder.addSpecifier | xpathBuilder.addRole, doc);
        }
    }).call(typeof (_QTP) != 'undefined' ? _QTP : window._QTP);
}