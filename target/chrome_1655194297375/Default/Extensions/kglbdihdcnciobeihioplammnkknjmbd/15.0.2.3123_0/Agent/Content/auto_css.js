/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

if (typeof (_QTP) != 'undefined' || window._QTP) {
    // we are injecting this file to IE's non-page context, where Node object is undefined
    if (typeof Node === 'undefined') {
        Node = {
            ELEMENT_NODE: 1,
            DOCUMENT_NODE: 9
        };
    }
    
    (function () {
        var _QTP = this;
        var WebInspector = {
            DOMPresentationUtils: {}
        };

        /**
         * @return {string}
         */
        function nodeNameInCorrectCase(node) {
            var shadowRootType = node.shadowRootType;
            if (shadowRootType) {
                return '#shadow-root (' + shadowRootType + ')';
            }
            return node.xmlVersion ? node.nodeName : node.nodeName.toLowerCase();
        }

        /**
         * @param {!WebInspector.DOMNode} node
         * @param {boolean=} optimized
         * @return {string}
         */
        WebInspector.DOMPresentationUtils.cssPath = function (node, optimized) {
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }

            var steps = [];
            var contextNode = node;
            while (contextNode) {
                var step = WebInspector.DOMPresentationUtils._cssPathStep(
                    contextNode, !!optimized, contextNode === node);
                if (!step) {
                    break; // Error - bail out early.
                }
                steps.push(step);
                if (step.optimized) {
                    break;
                }
                contextNode = contextNode.parentNode
            }

            steps.reverse();
            return steps.join(' > ');
        };

        /**
         * @param {!WebInspector.DOMNode} node
         * @param {boolean} optimized
         * @param {boolean} isTargetNode
         * @return {?WebInspector.DOMNodePathStep}
         */
        WebInspector.DOMPresentationUtils._cssPathStep = function (node, optimized, isTargetNode) {
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return null;
            }

            var id = node.getAttribute('id');
            if (optimized) {
                if (id) {
                    return new WebInspector.DOMNodePathStep(idSelector(id), true);
                }
                var nodeNameLower = node.nodeName.toLowerCase();
                if (nodeNameLower === 'body' || nodeNameLower === 'head' || nodeNameLower === 'html') {
                    return new WebInspector.DOMNodePathStep(nodeNameInCorrectCase(node), true);
                }
            }
            var nodeName = nodeNameInCorrectCase(node);

            if (id) {
                return new WebInspector.DOMNodePathStep(nodeName + idSelector(id), true);
            }
            var parent = node.parentNode;
            if (!parent || parent.nodeType === Node.DOCUMENT_NODE) {
                return new WebInspector.DOMNodePathStep(nodeName, true);
            }

            /**
             * @param {!WebInspector.DOMNode} node
             * @return {!Array.<string>}
             */
            function prefixedElementClassNames(node) {
                var classAttribute = node.getAttribute('class');
                if (!classAttribute) {
                    return [];
                }

				
                var split =  classAttribute.split(/\s+/g);
				var rc = [];
				for(var i = 0; i < split.length; i++) {
					if (split[i])
					  rc.push('$' + split[i]);
				}
				return rc;
            }

            /**
             * @param {string} id
             * @return {string}
             */
            function idSelector(id) {
                return '#' + escapeIdentifierIfNeeded(id);
            }

            /**
             * @param {string} ident
             * @return {string}
             */
            function escapeIdentifierIfNeeded(ident) {
                if (isCSSIdentifier(ident)) {
                    return ident;
                }
                var shouldEscapeFirst = /^(?:[0-9]|-[0-9-]?)/.test(ident);
                var lastIndex = ident.length - 1;
                return ident.replace(/./g, function (c, i) {
                    return ((shouldEscapeFirst && i === 0) || !isCSSIdentChar(c)) ? escapeAsciiChar(c, i === lastIndex) : c;
                })
            }

            /**
             * @param {string} c
             * @param {boolean} isLast
             * @return {string}
             */
            function escapeAsciiChar(c, isLast) {
                return '\\' + toHexByte(c) + (isLast ? '' : ' ');
            }

            /**
             * @param {string} c
             */
            function toHexByte(c) {
                var hexByte = c.charCodeAt(0).toString(16);
                if (hexByte.length === 1) {
                    hexByte = '0' + hexByte;
                }
                return hexByte;
            }

            /**
             * @param {string} c
             * @return {boolean}
             */
            function isCSSIdentChar(c) {
                if (/[a-zA-Z0-9_-]/.test(c)) {
                    return true;
                }
                return c.charCodeAt(0) >= 0xA0;
            }

            /**
             * @param {string} value
             * @return {boolean}
             */
            function isCSSIdentifier(value) {
                return /^-?[a-zA-Z_][a-zA-Z0-9_-]*$/.test(value);
            }

            var prefixedOwnClassNamesArray = prefixedElementClassNames(node);
            var needsClassNames = false;
            var needsNthChild = false;
            var ownIndex = -1;
            var elementIndex = -1;
            var siblings = parent.children;
            for (var i = 0; (ownIndex === -1 || !needsNthChild) && i < siblings.length; ++i) {
                var sibling = siblings[i];
                if (sibling.nodeType !== Node.ELEMENT_NODE) {
                    continue;
                }
                elementIndex += 1;
                if (sibling === node) {
                    ownIndex = elementIndex;
                    continue;
                }
                if (needsNthChild) {
                    continue;
                }
                if (nodeNameInCorrectCase(sibling) !== nodeName) {
                    continue;
                }

                needsClassNames = true;
                var ownClassNames = prefixedOwnClassNamesArray.keySet;
                var ownClassNameCount = 0;
                for (var name in ownClassNames) {
                    ++ownClassNameCount;
                }
                if (ownClassNameCount === 0) {
                    needsNthChild = true;
                    continue;
                }
                var siblingClassNamesArray = prefixedElementClassNames(sibling);
                for (var j = 0; j < siblingClassNamesArray.length; ++j) {
                    var siblingClass = siblingClassNamesArray[j];
                    if (!ownClassNames.hasOwnProperty(siblingClass)) {
                        continue;
                    }
                    delete ownClassNames[siblingClass];
                    if (!--ownClassNameCount) {
                        needsNthChild = true;
                        break;
                    }
                }
            }

            var result = nodeName;
            if (isTargetNode && nodeName.toLowerCase() === 'input' && node.getAttribute('type')
                && !node.getAttribute('id') && !node.getAttribute('class')) {
                result += '[type="' + node.getAttribute('type') + '"]';
            }
            if (needsNthChild) {
                result += ':nth-child(' + (ownIndex + 1) + ')';
            } else if (needsClassNames) {
                for (var prefixedName in prefixedOwnClassNamesArray.keySet) {
                    result += '.' + escapeIdentifierIfNeeded(prefixedName.substr(1));
                }
            }

            return new WebInspector.DOMNodePathStep(result, false);
        };

        WebInspector.DOMNodePathStep = function (value, optimized) {
            this.value = value;
            this.optimized = optimized || false;
        };

        WebInspector.DOMNodePathStep.prototype = {

            /**
             * @override
             * @return {string}
             */
            toString: function () {
                return this.value;
            }
        };
        _QTP.CSSGenerator = function (elem) {
            //_QTP.autoCssLog("***enter CSSGenerator ****");
           return WebInspector.DOMPresentationUtils.cssPath(elem);
        };
		_QTP.autoCssLog = function(str){
        	if (_QTP.wnd && _QTP.wnd.console) {
                _QTP.wnd.console.log(str);
            }
            else {
                var d= undefined;
                if ( typeof(GlobalNSResolver  ) != "undefined")
                    d= GlobalNSResolver.document;
                else
                    d= window.document;

                if (d && d.parentWindow)
                    d.parentWindow.console.log(str);
            }
        }
    }).call(typeof (_QTP) != 'undefined' ? _QTP : window._QTP);
}