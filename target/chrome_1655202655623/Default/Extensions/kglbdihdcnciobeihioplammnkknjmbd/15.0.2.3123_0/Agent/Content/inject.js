var _QTP; //keep the reference in scope object.

(function(){
    if (this._QTP && this._QTP.wnd)
        return;

    var qtpProps = {};

    qtpProps.wnd = this.window;	
    qtpProps.window = {};
    qtpProps.window.document = {};	
    qtpProps.window.undefined = undefined;
    if (qtpProps.wnd && qtpProps.wnd.XPathResult) {
        qtpProps.window.XPathResult = qtpProps.wnd.XPathResult;
    }
    var document = null; //will be set later when call evaluate
    var window = qtpProps.window;	
    var navigator = null;
if (typeof(_qtp_inject_xpath) == "undefined" || _qtp_inject_xpath == true)
{
    qtpProps.XPathInjector = function () {

    var undefined = void(0);

    var defaultConfig = {
        targetFrame: undefined,
        exportInstaller: false,
        useNative: true,
        useInnerText: true
    };

    var config={};

    for (var n in defaultConfig) {
        if (!(n in config)) config[n] = defaultConfig[n];
    }

    config.hasNative = !!(document.implementation
                            && document.implementation.hasFeature
                            && document.implementation.hasFeature("XPath", null));

    if (config.hasNative && config.useNative && !config.exportInstaller) {
        return;
    }

    var BinaryExpr;
    var FilterExpr;
    var FunctionCall;
    var Literal;
    var NameTest;
    var NodeSet;
    var NodeType;
    var NodeUtil;
    var Number;
    var PathExpr;
    var Step;
    var UnaryExpr;
    var UnionExpr;
    var VariableReference;

    /*
     * object: user agent identifier
     */
    var uai = new function() {

        var ua = navigator.userAgent;

        if (RegExp == undefined) {
            if (ua.indexOf("Opera") >= 0) {
                this.opera = true;
            } else if (ua.indexOf("Netscape") >= 0) {
                this.netscape = true;
            } else if (ua.indexOf("Mozilla/") == 0) {
                this.mozilla = true;
            } else {
                this.unknown = true;
            }

            if (ua.indexOf("Gecko/") >= 0) {
                this.gecko = true;
            }

            if (ua.indexOf("Win") >= 0) {
                this.windows = true;
            } else if (ua.indexOf("Mac") >= 0) {
                this.mac = true;
            } else if (ua.indexOf("Linux") >= 0) {
                this.linux = true;
            } else if (ua.indexOf("BSD") >= 0) {
                this.bsd = true;
            } else if (ua.indexOf("SunOS") >= 0) {
                this.sunos = true;
            }
        }
        else {

            /* for Trident/Tasman */
            /*@cc_on
            @if (@_jscript)
                function jscriptVersion() {
                    switch (@_jscript_version) {
                        case 3.0:  return "4.0";
                        case 5.0:  return "5.0";
                        case 5.1:  return "5.01";
                        case 5.5:  return "5.5";
                        case 5.6:
                            if ("XMLHttpRequest" in window) return "7.0";
                            return "6.0";
                        case 5.7:
                            return "7.0";
                        default:   return true;
                    }
                }
                if (@_win16 || @_win32 || @_win64) {
                    this.windows = true;
                    this.trident = jscriptVersion();
                } else if (@_mac || navigator.platform.indexOf("Mac") >= 0) {
                    // '@_mac' may be 'NaN' even if the platform is Mac,
                    // so we check 'navigator.platform', too.
                    this.mac = true;
                    this.tasman = jscriptVersion();
                }
                if (/MSIE (\d+\.\d+)b?;/.test(ua)) {
                    this.ie = RegExp.$1;
                    this['ie' + RegExp.$1.charAt(0)] = true;
                }
            @else @*/

            /* for AppleWebKit */
            if (/AppleWebKit\/(\d+(?:\.\d+)*)/.test(ua)) {
                this.applewebkit = RegExp.$1;
                if (RegExp.$1.charAt(0) == 4) {
                    this.applewebkit2 = true;
                }
                else {
                    this.applewebkit3 = true;
                }
            }

            /* for Gecko */
            else if (typeof Components == "object" &&
                     (/Gecko\/(\d{8})/.test(ua) ||
                      navigator.product == "Gecko" && /^(\d{8})$/.test(navigator.productSub))) {
                this.gecko = RegExp.$1;
            }

            /*@end @*/

            if (typeof(opera) == "object" && typeof(opera.version) == "function") {
                this.opera = opera.version();
                this['opera' + this.opera[0] + this.opera[2]] = true;
            } else if (typeof opera == "object"
                    && (/Opera[\/ ](\d+\.\d+)/.test(ua))) {
                this.opera = RegExp.$1;
            } else if (this.ie) {
            } else if (/Safari\/(\d+(?:\.\d+)*)/.test(ua)) {
                this.safari = RegExp.$1;
            } else if (/NetFront\/(\d+(?:\.\d+)*)/.test(ua)) {
                this.netfront = RegExp.$1;
            } else if (/Konqueror\/(\d+(?:\.\d+)*)/.test(ua)) {
                this.konqueror = RegExp.$1;
            } else if (ua.indexOf("(compatible;") < 0
                    && (/^Mozilla\/(\d+\.\d+)/.test(ua))) {
                this.mozilla = RegExp.$1;
                if (/\([^(]*rv:(\d+(?:\.\d+)*).*?\)/.test(ua))
                    this.mozillarv = RegExp.$1;
                if (/Firefox\/(\d+(?:\.\d+)*)/.test(ua)) {
                    this.firefox = RegExp.$1;
                } else if (/Netscape\d?\/(\d+(?:\.\d+)*)/.test(ua)) {
                    this.netscape = RegExp.$1;
                }
            } else {
                this.unknown = true;
            }

            if (ua.indexOf("Win 9x 4.90") >= 0) {
                this.windows = "ME";
            } else if (/Win(?:dows)? ?(NT ?(\d+\.\d+)?|\d+|ME|Vista|XP)/.test(ua)) {
                this.windows = RegExp.$1;
                if (RegExp.$2) {
                    this.winnt = RegExp.$2;
                } else switch (RegExp.$1) {
                    case "2000":   this.winnt = "5.0";  break;
                    case "XP":     this.winnt = "5.1";  break;
                    case "Vista":  this.winnt = "6.0";  break;
                }
            } else if (ua.indexOf("Mac") >= 0) {
                this.mac = true;
            } else if (ua.indexOf("Linux") >= 0) {
                this.linux = true;
            } else if (/(\w*BSD)/.test(ua)) {
                this.bsd = RegExp.$1;
            } else if (ua.indexOf("SunOS") >= 0) {
                this.sunos = true;
            }
        }
    };


    /**
     * pseudo class: Lexer
     */
    var Lexer = function(source) {
        var proto = Lexer.prototype;
        var tokens = source.match(proto.regs.token);
        for (var i = 0, l = tokens.length; i < l; i ++) {
            if (proto.regs.strip.test(tokens[i])) {
                tokens.splice(i, 1);
            }
        }
        for (var n in proto) tokens[n] = proto[n];
        tokens.index = 0;
        return tokens;
    };

    Lexer.prototype.regs = {
        token: /\$?(?:(?![0-9-])[\w-]+:)?(?![0-9-])[\w-]+|\/\/|\.\.|::|\d+(?:\.\d*)?|\.\d+|"[^"]*"|'[^']*'|[!<>]=|(?![0-9-])[\w-]+:\*|\s+|./g,
        strip: /^\s/
    };

    Lexer.prototype.peek = function(i) {
        return this[this.index + (i||0)];
    };
    Lexer.prototype.next = function() {
        return this[this.index++];
    };
    Lexer.prototype.back = function() {
        this.index--;
    };
    Lexer.prototype.empty = function() {
        return this.length <= this.index;
    };


    /**
     * class: Ctx
     */
    var Ctx = function(node, position, last) {
        this.node = node;
        this.position = position || 1;
        this.last = last || 1;
    };


    /**
     * abstract class: BaseExpr
     */
    var BaseExpr = function() {};

    BaseExpr.prototype.number = function(ctx) {
        var exrs = this.evaluate(ctx);
        if (exrs.isNodeSet) return exrs.number();
        return + exrs;
    };

    BaseExpr.prototype.string = function(ctx) {
        var exrs = this.evaluate(ctx);
        if (exrs.isNodeSet) return exrs.string();
        return '' + exrs;
    };

    BaseExpr.prototype.bool = function(ctx) {
        var exrs = this.evaluate(ctx);
        if (exrs.isNodeSet) return exrs.bool();
        return !! exrs;
    };


    /**
     * abstract class: BaseExprHasPredicates
     */
    var BaseExprHasPredicates = function() {};

    BaseExprHasPredicates.parsePredicates = function(lexer, expr) {
        while (lexer.peek() == '[') {
            lexer.next();
            if (lexer.empty()) {
                throw Error('missing predicate expr');
            }
            var predicate = BinaryExpr.parse(lexer);
            expr.predicate(predicate);
            if (lexer.empty()) {
                throw Error('unclosed predicate expr');
            }
            if (lexer.next() != ']') {
                lexer.back();
                throw Error('bad token: ' + lexer.next());
            }
        }
    };

    BaseExprHasPredicates.prototype = new BaseExpr();

    BaseExprHasPredicates.prototype.evaluatePredicates = function(nodeset, start) {
        var predicates, predicate, nodes, node, nodeset, position, reverse;

        reverse = this.reverse;
        predicates = this.predicates;

        nodeset.sort();

        for (var i = start || 0, l0 = predicates.length; i < l0; i ++) {
            predicate = predicates[i];

            var deleteIndexes = [];
            var nodes = nodeset.list();

            for (var j = 0, l1 = nodes.length; j < l1; j ++) {

                position = reverse ? (l1 - j) : (j + 1);
                exrs = predicate.evaluate(new Ctx(nodes[j], position, l1));

                switch (typeof exrs) {
                    case 'number':
                        exrs = (position == exrs);
                        break;
                    case 'string':
                        exrs = !!exrs;
                        break;
                    case 'object':
                        exrs = exrs.bool();
                        break;
                }

                if (!exrs) {
                    deleteIndexes.push(j);
                }
            }

            for (var j = deleteIndexes.length - 1, l1 = 0; j >= l1; j --) {
                nodeset.del(deleteIndexes[j]);
            }

        }

        return nodeset;
    };


    /**
     * class: BinaryExpr
     */
    if (!window.BinaryExpr && window.defaultConfig)
        window.BinaryExpr = null;

    BinaryExpr = function(op, left, right, datatype) {
        this.op = op;
        this.left = left;
        this.right = right;

        this.datatype = BinaryExpr.ops[op][2];

        this.needContextPosition = left.needContextPosition || right.needContextPosition;
        this.needContextNode = left.needContextNode || right.needContextNode;

        // Optimize [@id="foo"] and [@name="bar"]
        if (this.op == '=') {
            if (!right.needContextNode && !right.needContextPosition && 
                right.datatype != 'nodeset' && right.datatype != 'void' && left.quickAttr) {
                this.quickAttr = true;
                this.attrName = left.attrName;
                this.attrValueExpr = right;
            }
            else if (!left.needContextNode && !left.needContextPosition && 
                left.datatype != 'nodeset' && left.datatype != 'void' && right.quickAttr) {
                this.quickAttr = true;
                this.attrName = right.attrName;
                this.attrValueExpr = left;
            }
        }
    };

    BinaryExpr.compare = function(op, comp, left, right, ctx) {
        var type, lnodes, rnodes, nodes, nodeset, primitive;

        left = left.evaluate(ctx);
        right = right.evaluate(ctx);

        if (left.isNodeSet && right.isNodeSet) {
            lnodes = left.list();
            rnodes = right.list();
            for (var i = 0, l0 = lnodes.length; i < l0; i ++)
                for (var j = 0, l1 = rnodes.length; j < l1; j ++)
                    if (comp(NodeUtil.to('string', lnodes[i]), NodeUtil.to('string', rnodes[j])))
                        return true;
            return false;
        }

        if (left.isNodeSet || right.isNodeSet) {
            if (left.isNodeSet)
                nodeset = left, primitive = right;
            else
                nodeset = right, primitive = left;

            nodes = nodeset.list();
            type = typeof primitive;
            for (var i = 0, l = nodes.length; i < l; i ++) {
                if (comp(NodeUtil.to(type, nodes[i]), primitive))
                    return true;
            }
            return false;
        }

        if (op == '=' || op == '!=') {
            if (typeof left == 'boolean' || typeof right == 'boolean') {
                return comp(!!left, !!right);
            }
            if (typeof left == 'number' || typeof right == 'number') {
                return comp(+left, +right);
            }
            return comp(left, right);
        }

        return comp(+left, +right);
    };


    BinaryExpr.ops = {
        'div': [6, function(left, right, ctx) {
            return left.number(ctx) / right.number(ctx);
        }, 'number'],
        'mod': [6, function(left, right, ctx) {
            return left.number(ctx) % right.number(ctx);
        }, 'number'],
        '*': [6, function(left, right, ctx) {
            return left.number(ctx) * right.number(ctx);
        }, 'number'],
        '+': [5, function(left, right, ctx) {
            return left.number(ctx) + right.number(ctx);
        }, 'number'],
        '-': [5, function(left, right, ctx) {
            return left.number(ctx) - right.number(ctx);
        }, 'number'],
        '<': [4, function(left, right, ctx) {
            return BinaryExpr.compare('<',
                        function(a, b) { return a < b }, left, right, ctx);
        }, 'boolean'],
        '>': [4, function(left, right, ctx) {
            return BinaryExpr.compare('>',
                        function(a, b) { return a > b }, left, right, ctx);
        }, 'boolean'],
        '<=': [4, function(left, right, ctx) {
            return BinaryExpr.compare('<=',
                        function(a, b) { return a <= b }, left, right, ctx);
        }, 'boolean'],
        '>=': [4, function(left, right, ctx) {
            return BinaryExpr.compare('>=',
                        function(a, b) { return a >= b }, left, right, ctx);
        }, 'boolean'],
        '=': [3, function(left, right, ctx) {
            return BinaryExpr.compare('=',
                        function(a, b) { return a == b }, left, right, ctx);
        }, 'boolean'],
        '!=': [3, function(left, right, ctx) {
            return BinaryExpr.compare('!=',
                        function(a, b) { return a != b }, left, right, ctx);
        }, 'boolean'],
        'and': [2, function(left, right, ctx) {
            return left.bool(ctx) && right.bool(ctx);
        }, 'boolean'],
        'or': [1, function(left, right, ctx) {
            return left.bool(ctx) || right.bool(ctx);
        }, 'boolean']
    };


    BinaryExpr.parse = function(lexer) {
        var op, precedence, info, expr, stack = [], index = lexer.index;

        while (true) {

            if (lexer.empty()) {
                throw Error('missing right expression');
            }
            expr = UnaryExpr.parse(lexer);

            op = lexer.next();
            if (!op) {
                break;
            }

            info = this.ops[op];
            precedence = info && info[0];
            if (!precedence) {
                lexer.back();
                break;
            }

            while (stack.length && precedence <= this.ops[stack[stack.length-1]][0]) {
                expr = new BinaryExpr(stack.pop(), stack.pop(), expr);
            }

            stack.push(expr, op);
        }

        while (stack.length) {
            expr = new BinaryExpr(stack.pop(), stack.pop(), expr);
        }

        return expr;
    };

    BinaryExpr.prototype = new BaseExpr();

    BinaryExpr.prototype.evaluate = function(ctx) {
        return BinaryExpr.ops[this.op][1](this.left, this.right, ctx);
    };

    BinaryExpr.prototype.show = function(indent) {
        indent = indent || '';
        var t = '';
        t += indent + 'binary: ' + this.op + '\n';
        indent += '    ';
        t += this.left.show(indent);
        t += this.right.show(indent);
        return t;
    };


    /**
     * class: UnaryExpr
     */
    if (!window.UnaryExpr && window.defaultConfig)
        window.UnaryExpr = null;

    UnaryExpr = function(op, expr) {
        this.op = op;
        this.expr = expr;

        this.needContextPosition = expr.needContextPosition;
        this.needContextNode = expr.needContextNode;
    };

    UnaryExpr.ops = { '-': 1 };

    UnaryExpr.parse = function(lexer) {
        var token;
        if (this.ops[lexer.peek()])
            return new UnaryExpr(lexer.next(), UnaryExpr.parse(lexer));
        else
            return UnionExpr.parse(lexer);
    };

    UnaryExpr.prototype = new BaseExpr();

    UnaryExpr.prototype.datatype = 'number';

    UnaryExpr.prototype.evaluate = function(ctx) {
        return - this.expr.number(ctx);
    };

    UnaryExpr.prototype.show = function(indent) {
        indent = indent || '';
        var t = '';
        t += indent + 'unary: ' + this.op + '\n';
        indent += '    ';
        t += this.expr.show(indent);
        return t;
    };


    /**
     * class: UnionExpr
     */
    if (!window.UnionExpr && window.defaultConfig)
        window.UnionExpr = null;

    UnionExpr = function() {
        this.paths = [];
    };

    UnionExpr.ops = { '|': 1 };


    UnionExpr.parse = function(lexer) {
        var union, expr;

        expr = PathExpr.parse(lexer);
        if (!this.ops[lexer.peek()])
            return expr;

        union = new UnionExpr();
        union.path(expr);

        while (true) {
            if (!this.ops[lexer.next()]) break;
            if (lexer.empty()) {
                throw Error('missing next union location path');
            }
            union.path(PathExpr.parse(lexer));
        }



        lexer.back();
        return union;
    };

    UnionExpr.prototype = new BaseExpr();

    UnionExpr.prototype.datatype = 'nodeset';

    UnionExpr.prototype.evaluate = function(ctx) {
        var paths = this.paths;
        var nodeset = new NodeSet();
        for (var i = 0, l = paths.length; i < l; i ++) {
            var exrs = paths[i].evaluate(ctx);
            if (!exrs.isNodeSet) throw Error('PathExpr must be nodeset');
            nodeset.merge(exrs);
        }
        return nodeset;
    };

    UnionExpr.prototype.path = function(path) {
        this.paths.push(path);

        if (path.needContextPosition) {
            this.needContextPosition = true;
        }
        if (path.needContextNode) {
            this.needContextNode = true;
        }
    }
    UnionExpr.prototype.show = function(indent) {
        indent = indent || '';
        var t = '';
        t += indent + 'union:' + '\n';
        indent += '    ';
        for (var i = 0; i < this.paths.length; i ++) {
            t += this.paths[i].show(indent);
        }
        return t;
    };


    /**
     * class: PathExpr
     */
    if (!window.PathExpr && window.defaultConfig)
        window.PathExpr = null;

    PathExpr = function(filter) {
        this.filter = filter;
        this.steps = [];

        this.datatype = filter.datatype;

        this.needContextPosition = filter.needContextPosition;
        this.needContextNode = filter.needContextNode;
    };

    PathExpr.ops = { '//': 1, '/': 1 };

    PathExpr.parse = function(lexer) {
        var op, expr, path, token;

        if (this.ops[lexer.peek()]) {
            op = lexer.next();
            token = lexer.peek();

            if (op == '/' && (lexer.empty() || 
                    (token != '.' && token != '..' && token != '@' && token != '*' && 
                    !/(?![0-9])[\w]/.test(token)))) { 
                return FilterExpr.root();
            }

            path = new PathExpr(FilterExpr.root()); // RootExpr

            if (lexer.empty()) {
                throw Error('missing next location step');
            }
            expr = Step.parse(lexer);
            path.step(op, expr);
        }
        else {
            expr = FilterExpr.parse(lexer);
            if (!expr) {
                expr = Step.parse(lexer);
                path = new PathExpr(FilterExpr.context());
                path.step('/', expr);
            }
            else if (!this.ops[lexer.peek()])
                return expr;
            else
                path = new PathExpr(expr);
        }

        while (true) {
            if (!this.ops[lexer.peek()]) break;
            op = lexer.next();
            if (lexer.empty()) {
                throw Error('missing next location step');
            }
            path.step(op, Step.parse(lexer));
        }

        return path;
    };

    PathExpr.prototype = new BaseExpr();

    PathExpr.prototype.evaluate = function(ctx) {
        var nodeset = this.filter.evaluate(ctx);
        if (!nodeset.isNodeSet) throw Exception('Filter nodeset must be nodeset type');

        var steps = this.steps;

        for (var i = 0, l0 = steps.length; i < l0 && nodeset.length; i ++) {
            var step = steps[i][1];
            var reverse = step.reverse;
            var iter = nodeset.iterator(reverse);
            var prevNodeset = nodeset;
            nodeset = null;
            var node, next;
            if (!step.needContextPosition && step.axis == 'following') {
                for (node = iter(); next = iter(); node = next) {

                    // Safari 2 node.contains problem
                    if (uai.applewebkit2) {
                        var contains = false;
                        var ancestor = next;
                        do {
                            if (ancestor == node) {
                                contains = true;
                                break;
                            }
                        } while (ancestor = ancestor.parentNode);
                        if (!contains) break;
                    }
                    else {
                        try { if (!node.contains(next)) break }
                        catch(e) { if (!(next.compareDocumentPosition(node) & 8)) break }
                    }
                }
                nodeset = step.evaluate(new Ctx(node));
            }
            else if (!step.needContextPosition && step.axis == 'preceding') {
                node = iter();
                nodeset = step.evaluate(new Ctx(node));
            }
            else {
                node = iter();
                var j = 0;
                nodeset = step.evaluate(new Ctx(node), false, prevNodeset, j);
                while (node = iter()) {
                    j ++;
                    nodeset.merge(step.evaluate(new Ctx(node), false, prevNodeset, j));
                }
            }
        }

        return nodeset;
    };

    PathExpr.prototype.step = function(op, step) {
        step.op = op;
        this.steps.push([op, step]);

        this.quickAttr = false;

        if (this.steps.length == 1) {
            if (op == '/' && step.axis == 'attribute') {
                var test = step.test;
                if (!test.notOnlyElement && test.name != '*') {
                    this.quickAttr = true;
                    this.attrName = test.name;
                }
            }
        }
    };

    PathExpr.prototype.show = function(indent) {
        indent = indent || '';
        var t = '';
        t += indent + 'path:' + '\n';
        indent += '    ';
        t += indent + 'filter:' + '\n';
        t += this.filter.show(indent + '    ');
        if (this.steps.length) {
            t += indent + 'steps:' + '\n';
            indent += '    ';
            for (var i = 0; i < this.steps.length; i ++) {
                var step = this.steps[i];
                t += indent + 'operator: ' + step[0] + '\n';
                t += step[1].show(indent);
            }
        }
        return t;
    };


    /**
     * class: FilterExpr
     */
    if (!window.FilterExpr && window.defaultConfig)
        window.FilterExpr = null;

    FilterExpr = function(primary) {
        this.primary = primary;
        this.predicates = [];

        this.datatype = primary.datatype;

        this.needContextPosition = primary.needContextPosition;

        this.needContextNode = primary.needContextNode;
    };

    FilterExpr.parse = function(lexer) {
        var expr, filter, token, ch;

        token = lexer.peek();
        ch = token.charAt(0);

        switch (ch) {
            case '$':
                expr = VariableReference.parse(lexer);
                break;

            case '(':
                lexer.next();
                expr = BinaryExpr.parse(lexer);
                if (lexer.empty()) {
                    throw Error('unclosed "("');
                }
                if (lexer.next() != ')') {
                    lexer.back();
                    throw Error('bad token: ' + lexer.next());
                }
                break;

            case '"':
            case "'":
                expr = Literal.parse(lexer);
                break;

            default:
                if (!isNaN(+token)) {
                    expr = Number.parse(lexer);
                }

                else if (NodeType.types[token]) {
                    return null;
                }

                else if (/(?![0-9])[\w]/.test(ch) && lexer.peek(1) == '(') {
                    expr = FunctionCall.parse(lexer);
                }
                else {
                    return null;
                }
                break;
        }

        if (lexer.peek() != '[') return expr;

        filter = new FilterExpr(expr);

        BaseExprHasPredicates.parsePredicates(lexer, filter);

        return filter;
    };

    FilterExpr.root = function() {
        return new FunctionCall('root-node');
    };
    FilterExpr.context = function() {
        return new FunctionCall('context-node');
    };

    FilterExpr.prototype = new BaseExprHasPredicates();

    FilterExpr.prototype.evaluate = function(ctx) {
        var nodeset = this.primary.evaluate(ctx);
        if(!nodeset.isNodeSet) {
            if (this.predicates.length)
                throw Error(
                    'Primary result must be nodeset type ' +
                    'if filter have predicate expression');
            return nodeset;
        }

        return  this.evaluatePredicates(nodeset);
    };

    FilterExpr.prototype.predicate = function(predicate) {
        this.predicates.push(predicate);
    };

    FilterExpr.prototype.show = function(indent) {
        indent = indent || '';
        var t = '';
        t += indent + 'filter: ' + '\n';
        indent += '    ';
        t += this.primary.show(indent);
        if (this.predicates.length) {
            t += indent + 'predicates: ' + '\n';
            indent += '    ';
            for (var i = 0; i < this.predicates.length; i ++) {
                t += this.predicates[i].show(indent);
            }
        }
        return t;
    };


    if (!window.NodeUtil && window.defaultConfig)
        window.NodeUtil = null;

    NodeUtil = {
        to: function(valueType, node) {
            var t, type = node.nodeType;
            // Safari2: innerText contains some bugs
            if (type == 1 && config.useInnerText && !uai.applewebkit2) {
                t = node.textContent;
                t = (t == undefined || t == null) ? node.innerText : t;
                t = (t == undefined || t == null) ? '' : t;
            }
            if (typeof t != 'string') {
    /*@cc_on
                if (type == 1 && node.nodeName.toLowerCase() == 'title') {
                    t = node.text;
                }
                else
    @*/
                if (type == 9 || type == 1) {
                    if (type == 9) {
                        node =  node.documentElement;
                    }
                    else {
                        node = node.firstChild;
                    }
                    for (t = '', stack = [], i = 0; node;) {
                        do {
                            if (node.nodeType != 1) {
                                t += node.nodeValue;
                            }
    /*@cc_on
                            else if (node.nodeName.toLowerCase() == 'title') {
                                t += node.text;
                            }
    @*/
                            stack[i++] = node; // push
                        } while (node = node.firstChild);
                        while (i && !(node = stack[--i].nextSibling)) {}
                    }
                }
                else {
                    t = node.nodeValue;
                }
            }
            switch (valueType) {
                case 'number':
                    return + t;
                case 'boolean':
                    return !! t;
                default:
                    return t;
            }
        },
        attrPropMap: {
            name: 'name',
            'class': 'className',
            dir: 'dir',
            id: 'id',
            name: 'name',
            title: 'title'
        },
        attrMatch: function(node, attrName, attrValue) {
    /*@cc_on @if (@_jscript)
            var propName = NodeUtil.attrPropMap[attrName];
            if (!attrName ||
                attrValue == null && (
                    propName && node[propName] ||
                    !propName && node.getAttribute && node.getAttribute(attrName, 2)
                ) ||
                attrValue != null && (
                    propName && node[propName] == attrValue ||
                    !propName && node.getAttribute && node.getAttribute(attrName, 2) == attrValue
                )) {
    @else @*/
            if (!attrName ||
                attrValue == null && node.hasAttribute && node.hasAttribute(attrName) ||
                attrValue != null && node.getAttribute && node.getAttribute(attrName) == attrValue) {
    /*@end @*/
                return true;
            }
            else {
                return false;
            }
        },
        getDescendantNodes: function(test, node, nodeset, attrName, attrValue, prevNodeset, prevIndex) {
            if (prevNodeset) {
                prevNodeset.delDescendant(node, prevIndex);
            }
    /*@cc_on
            try {
                if (!test.notOnlyElement || test.type == 8 || (attrName && test.type == 0)) {

                    var all = node.all||node.getElementsByTagName("*");
                    if (!all) {
                        return nodeset;
                    }

                    var name = test.name;
                    if (test.type == 8) name = '!';
                    else if (test.type == 0) name = '*';

                    if (name != '*') {
						all = all.tags(name);

						if ((typeof(all) === "string") || !all) // Workaround to solve defect 96547
						{
							all = node.getElementsByTagName(name);
						}
						
						if (!all) {
                            return nodeset;
                        }
                    }

                    if (attrName) {
                        var result = []
                        var i = 0;
                        if (attrValue != null && (attrName == 'id' || attrName == 'name')) {
                            all = all[attrValue];
                            if (!all) {
                                return nodeset;
                            }
                            if (!all.length || all.nodeType) {
                                all = [all];
                            }
                        }
            
                        while (node = all[i++]) {
                            if (NodeUtil.attrMatch(node, attrName, attrValue)) result.push(node);
                        }

                        all = result;
                    }

                    var i = 0;
                    while (node = all[i++]) {
                        if (name != '*' || node.tagName != '!') {
                            nodeset.push(node);
                        }
                    }

                    return nodeset;
                }

                (function (parent) {
                    var g = arguments.callee;
                    var node = parent.firstChild;
                    if (node) {
                        for (; node; node = node.nextSibling) {
                            if (NodeUtil.attrMatch(node, attrName, attrValue)) {
                                if (test.match(node)) nodeset.push(node);
                            }
                            g(node);
                        }
                    }
                })(node);

                return nodeset;
            }
            catch(e) {
    @*/
            if (attrValue && attrName == 'id' && node.getElementById) {
                node = node.getElementById(attrValue);
                if (node && test.match(node)) {
                    nodeset.push(node);
                }
            }
            else if (attrValue && attrName == 'name' && node.getElementsByName) {
                var nodes = node.getElementsByName(attrValue);
                for (var i = 0, l = nodes.length; i < l; i ++) {
                    node = nodes[i];
                    if (uai.opera ? (node.name == attrValue && test.match(node)) : test.match(node)) {
                        nodeset.push(node);
                    }
                }
            }
            else if (attrValue && attrName == 'class' && node.getElementsByClassName) {
                var nodes = node.getElementsByClassName(attrValue);
                for (var i = 0, l = nodes.length; i < l; i ++) {
                    node = nodes[i];
                    if (node.className == attrValue && test.match(node)) {
                        nodeset.push(node);
                    }
                }
            }
            else if (test.notOnlyElement) {
                (function (parent) {
                    var f = arguments.callee;
                    for (var node = parent.firstChild; node; node = node.nextSibling) {
                        if (NodeUtil.attrMatch(node, attrName, attrValue)) {
                            if (test.match(node.nodeType)) nodeset.push(node);
                        }
                        f(node);
                    }
                })(node);
            }
            else {
                var name = test.name;
                if (node.getElementsByTagName) {
                    var nodes = node.getElementsByTagName(name);
                    if (nodes) {
                        var i = 0;
                        while (node = nodes[i++]) {
                            if (NodeUtil.attrMatch(node, attrName, attrValue)) nodeset.push(node);
                        }
                    }
                }
            }
            return nodeset;
    /*@cc_on
            }
    @*/
        },

        getChildNodes: function(test, node, nodeset, attrName, attrValue) {

    /*@cc_on
            try {
                var children;

                if ((!test.notOnlyElement || test.type == 8 || (attrName && test.type == 0)) && (children = node.children)) {
                    var name, elm;

                    name = test.name;
                    if (test.type == 8) name = '!';
                    else if (test.type == 0) name = '*';

                    if (name != '*') {
                        children = children.tags(name);
                        if (!children) {
                            return nodeset;
                        }
                    }

                    if (attrName) {
                        var result = []
                        var i = 0;
                        if (attrName == 'id' || attrName == 'name') {
                            children = children[attrValue];
            
                            if (!children) {
                                return nodeset;
                            }
            
                            if (!children.length || children.nodeType) {
                                children = [children];
                            }
                        }
            
                        while (node = children[i++]) {
                            if (NodeUtil.attrMatch(node, attrName, attrValue)) result.push(node);
                        }
                        children = result;
                    }

                    var i = 0;
                    while (node = children[i++]) {
                        if (name != '*' || node.tagName != '!') {
                            nodeset.push(node);
                        }
                    }

                    return nodeset;
                }

                for (var i = 0, node = node.firstChild; node; i++, node = node.nextSibling) {
                    if (NodeUtil.attrMatch(node, attrName, attrValue)) {
                        if (test.match(node)) nodeset.push(node);
                    }
                }

                return nodeset;
            } catch(e) {
    @*/
            for (var node = node.firstChild; node; node = node.nextSibling) {
                if (NodeUtil.attrMatch(node, attrName, attrValue)) {
                    if (test.match(node)) nodeset.push(node);
                }
            }
            return nodeset;
    /*@cc_on
            }
    @*/
        }
    };

    /*@cc_on
    var AttributeWrapper = function(node, parent, sourceIndex) {
        this.node = node;
        this.nodeType = 2;
        this.nodeValue = node.nodeValue;
        this.nodeName = node.nodeName;
        this.parentNode = parent;
        this.ownerElement = parent;
        this.parentSourceIndex = sourceIndex;
    };

    @*/


    /**
     * class: Step
     */
    if (!window.Step && window.defaultConfig)
        window.Step = null;

    Step = function(axis, test) {
        // TODO check arguments and throw axis error
        this.axis = axis;
        this.reverse = Step.axises[axis][0];
        this.func = Step.axises[axis][1];
        this.test = test;
        this.predicates = [];
        this._quickAttr = Step.axises[axis][2]
    };

    Step.axises = {

        ancestor: [true, function(test, node, nodeset, _, __, prevNodeset, prevIndex) {
            while (node = node.parentNode) {
                if (prevNodeset && node.nodeType == 1) {
                    prevNodeset.reserveDelByNode(node, prevIndex, true);
                }
                if (test.match(node)) nodeset.unshift(node);
            }
            return nodeset;
        }],

        'ancestor-or-self': [true, function(test, node, nodeset, _, __, prevNodeset, prevIndex) {
            do {
                if (prevNodeset && node.nodeType == 1) {
                    prevNodeset.reserveDelByNode(node, prevIndex, true);
                }
                if (test.match(node)) nodeset.unshift(node);
            } while (node = node.parentNode)
            return nodeset;
        }],

        attribute: [false, function(test, node, nodeset) {
            var attrs = node.attributes;
            if (attrs) {
    /*@cc_on
                var sourceIndex = node.sourceIndex;
    @*/
                if ((test.notOnlyElement && test.type == 0) || test.name == '*') {
                    for (var i = 0, attr; attr = attrs[i]; i ++) {
    /*@cc_on @if (@_jscript)
                        if (attr.nodeValue) {
                            nodeset.push(new AttributeWrapper(attr, node, sourceIndex));
                        }
    @else @*/
                        nodeset.push(attr);
    /*@end @*/
                    }
                }
                else {
                    var attr = attrs.getNamedItem(test.name);
                    
    /*@cc_on @if (@_jscript)
                    if (attr && attr.nodeValue) {
                        attr = new AttributeWrapper(attr, node, sourceIndex);;
    @else @*/
                    if (attr) {
    /*@end @*/
                        nodeset.push(attr);
                    }
                }
            }
            return nodeset;
        }],

        child: [false, NodeUtil.getChildNodes, true],

        descendant: [false, NodeUtil.getDescendantNodes, true],

        'descendant-or-self': [false, function(test, node, nodeset, attrName, attrValue, prevNodeset, prevIndex) {
            if (NodeUtil.attrMatch(node, attrName, attrValue)) {
                if (test.match(node)) nodeset.push(node);
            }
            return NodeUtil.getDescendantNodes(test, node, nodeset, attrName, attrValue, prevNodeset, prevIndex);
        }, true],

        following: [false, function(test, node, nodeset, attrName, attrValue) {
            do {
                var child = node;
                while (child = child.nextSibling) {
                    if (NodeUtil.attrMatch(child, attrName, attrValue)) {
                        if (test.match(child)) nodeset.push(child);
                    }
                    nodeset = NodeUtil.getDescendantNodes(test, child, nodeset, attrName, attrValue);
                }
            } while (node = node.parentNode);
            return nodeset;
        }, true],

        'following-sibling': [false, function(test, node, nodeset, _, __, prevNodeset, prevIndex) {
            while (node = node.nextSibling) {

                if (prevNodeset && node.nodeType == 1) {
                    prevNodeset.reserveDelByNode(node, prevIndex);
                }

                if (test.match(node)) {
                    nodeset.push(node);
                }
            }
            return nodeset;
        }],

        namespace: [false, function(test, node, nodeset) {
            // not implemented
            return nodeset;
        }],

        parent: [false, function(test, node, nodeset) {
            if (node.nodeType == 9) {
                return nodeset;
            }
            if (node.nodeType == 2) {
                nodeset.push(node.ownerElement);
                return nodeset;
            }
            var node = node.parentNode;
            if (test.match(node)) nodeset.push(node);
            return nodeset;
        }],

        preceding: [true, function(test, node, nodeset, attrName, attrValue) {
            var parents = [];
            do {
                parents.unshift(node);
            } while (node = node.parentNode);

            for (var i = 1, l0 = parents.length; i < l0; i ++) {
                var siblings = [];
                node = parents[i];
                while (node = node.previousSibling) {
                    siblings.unshift(node);
                }

                for (var j = 0, l1 = siblings.length; j < l1; j ++) {
                    node = siblings[j];
                    if (NodeUtil.attrMatch(node, attrName, attrValue)) {
                        if (test.match(node)) nodeset.push(node);
                    }
                    nodeset = NodeUtil.getDescendantNodes(test, node, nodeset, attrName, attrValue);
                }
            }
            return nodeset;
        }, true],

        'preceding-sibling': [true, function(test, node, nodeset, _, __, prevNodeset, prevIndex) {
            while (node = node.previousSibling) {

                if (prevNodeset && node.nodeType == 1) {
                    prevNodeset.reserveDelByNode(node, prevIndex, true);
                }

                if (test.match(node)) {
                    nodeset.unshift(node)
                }
            }
            return nodeset;
        }],

        self: [false, function(test, node, nodeset) {
            if (test.match(node)) nodeset.push(node);
            return nodeset;
        }]
    };

    Step.parse = function(lexer) {
        var axis, test, step, token;

        if (lexer.peek() == '.') {
            step = this.self();
            lexer.next();
        }
        else if (lexer.peek() == '..') {
            step = this.parent();
            lexer.next();
        }
        else {
            if (lexer.peek() == '@') {
                axis = 'attribute';
                lexer.next();
                if (lexer.empty()) {
                    throw Error('missing attribute name');
                }
            }
            else {
                if (lexer.peek(1) == '::') {
                    
                    if (!/(?![0-9])[\w]/.test(lexer.peek().charAt(0))) {
                        throw Error('bad token: ' + lexer.next());
                    }
            
                    axis = lexer.next();
                    lexer.next();

                    if (!this.axises[axis]) {
                        throw Error('invalid axis: ' + axis);
                    }
                    if (lexer.empty()) {
                        throw Error('missing node name');
                    }
                }
                else {
                    axis = 'child';
                }
            }
        
            token = lexer.peek();
            if (!/(?![0-9])[\w]/.test(token.charAt(0))) {
                if (token == '*') {
                    test = NameTest.parse(lexer)
                }
                else {
                    throw Error('bad token: ' + lexer.next());
                }
            }
            else {
                if (lexer.peek(1) == '(') {
                    if (!NodeType.types[token]) {
                        throw Error('invalid node type: ' + token);
                    }
                    test = NodeType.parse(lexer)
                }
                else {
                    test = NameTest.parse(lexer);
                }
            }
            step = new Step(axis, test);
        }

        BaseExprHasPredicates.parsePredicates(lexer, step);

        return step;
    };

    Step.self = function() {
        return new Step('self', new NodeType('node'));
    };

    Step.parent = function() {
        return new Step('parent', new NodeType('node'));
    };

    Step.prototype = new BaseExprHasPredicates();

    Step.prototype.evaluate = function(ctx, special, prevNodeset, prevIndex) {
        var node = ctx.node;
        var reverse = false;

        if (!special && this.op == '//') {

            if (!this.needContextPosition && this.axis == 'child') {
                if (this.quickAttr) {
                    var attrValue = this.attrValueExpr ? this.attrValueExpr.string(ctx) : null;
                    var nodeset = NodeUtil.getDescendantNodes(this.test, node, new NodeSet(), this.attrName, attrValue, prevNodeset, prevIndex);
                    nodeset = this.evaluatePredicates(nodeset, 1);
                }
                else {
                    var nodeset = NodeUtil.getDescendantNodes(this.test, node, new NodeSet(), null, null, prevNodeset, prevIndex);
                    nodeset = this.evaluatePredicates(nodeset);
                }
            }
            else {
                var step = new Step('descendant-or-self', new NodeType('node'));
                var nodes = step.evaluate(ctx, false, prevNodeset, prevIndex).list();
                var nodeset = null;
                step.op = '/';
                for (var i = 0, l = nodes.length; i < l; i ++) {
                    if (!nodeset) {
                        nodeset = this.evaluate(new Ctx(nodes[i]), true);
                    }
                    else {
                        nodeset.merge(this.evaluate(new Ctx(nodes[i]), true));
                    }
                }
                nodeset = nodeset || new NodeSet();
            }
        }
        else {

            if (this.needContextPosition) {
                prevNodeset = null;
                prevIndex = null;
            }

            if (this.quickAttr) {
                var attrValue = this.attrValueExpr ? this.attrValueExpr.string(ctx) : null;
                var nodeset = this.func(this.test, node, new NodeSet(), this.attrName, attrValue, prevNodeset, prevIndex);
                nodeset = this.evaluatePredicates(nodeset, 1);
            }
            else {
                var nodeset = this.func(this.test, node, new NodeSet(), null, null, prevNodeset, prevIndex);
                nodeset = this.evaluatePredicates(nodeset);
            }
            if (prevNodeset) {
                prevNodeset.doDel();
            }
        }
        return nodeset;
    };

    Step.prototype.predicate = function(predicate) {
        this.predicates.push(predicate);

        if (predicate.needContextPosition ||
            predicate.datatype == 'number'||
            predicate.datatype == 'void') {
            this.needContextPosition = true;
        }

        if (this._quickAttr && this.predicates.length == 1 && predicate.quickAttr) {
            var attrName = predicate.attrName;
    /*@cc_on @if (@_jscript)
            this.attrName = attrName.toLowerCase();
    @else @*/
            this.attrName = attrName;
    /*@end @*/
            this.attrValueExpr = predicate.attrValueExpr;
            this.quickAttr = true;
        }
    };

    Step.prototype.show = function(indent) {
        indent = indent || '';
        var t = '';
        t += indent + 'step: ' + '\n';
        indent += '    ';
        if (this.axis) t += indent + 'axis: ' + this.axis + '\n';
        t += this.test.show(indent);
        if (this.predicates.length) {
            t += indent + 'predicates: ' + '\n';
            indent += '    ';
            for (var i = 0; i < this.predicates.length; i ++) {
                t += this.predicates[i].show(indent);
            }
        }
        return t;
    };



    /**
     * NodeType
     */
    if (!window.NodeType && window.defaultConfig)
        window.NodeType = null;
        
    NodeType = function(name, literal) {
        this.name = name;
        this.literal = literal;

        switch (name) {
            case 'comment':
                this.type = 8;
                break;
            case 'text':
                this.type = 3;
                break;
            case 'processing-instruction':
                this.type = 7;
                break;
            case 'node':
                this.type = 0;
                break;
        }
    };

    NodeType.types = {
        'comment':1, 'text':1, 'processing-instruction':1, 'node':1
    };

    NodeType.parse = function(lexer) {
        var type, literal, ch;
        type = lexer.next();
        lexer.next();
        if (lexer.empty()) {
            throw Error('bad nodetype');
        }
        ch = lexer.peek().charAt(0);
        if (ch == '"' || ch == "'") {
            literal = Literal.parse(lexer);
        }
        if (lexer.empty()) {
            throw Error('bad nodetype');
        }
        if (lexer.next() != ')') {
            lexer.back();
            throw Error('bad token ' + lexer.next());
        }
        return new NodeType(type, literal);
    };

    NodeType.prototype = new BaseExpr();

    NodeType.prototype.notOnlyElement = true;

    NodeType.prototype.match = function(node) {
        return !this.type || this.type == node.nodeType;
    };

    NodeType.prototype.show = function(indent) {
        indent = indent || '';
        var t = '';
        t += indent + 'nodetype: ' + this.type + '\n';
        if (this.literal) {
            indent += '    ';
            t += this.literal.show(indent);
        }
        return t;
    };


    /**
     * NodeType
     */
    if (!window.NameTest && window.defaultConfig)
        window.NameTest = null;

    NameTest = function(name) {
        this.name = name.toLowerCase();
    };

    NameTest.parse = function(lexer) {
        if (lexer.peek() != '*' &&  lexer.peek(1) == ':' && lexer.peek(2) == '*') {
            return new NameTest(lexer.next() + lexer.next() + lexer.next());
        }
        return new NameTest(lexer.next());
    };

    NameTest.prototype = new BaseExpr();

    NameTest.prototype.match = function(node) {
        var type = node.nodeType;

        if (type == 1 || type == 2) {
            if (this.name == '*' || this.name == node.nodeName.toLowerCase()) {
                return true;
            }
        }
        return false;
    };

    NameTest.prototype.show = function(indent) {
        indent = indent || '';
        var t = '';
        t += indent + 'nametest: ' + this.name + '\n';
        return t;
    };


    /**
     * class: VariableRefernce
     */
    if (!window.VariableReference && window.defaultConfig)
        window.VariableReference = null;
        
    VariableReference = function(name) {
        this.name = name.substring(1);
    };


    VariableReference.parse = function(lexer) {
        var token = lexer.next();
        if (token.length < 2) {
            throw Error('unnamed variable reference');
        }
        return new VariableReference(token)
    };

    VariableReference.prototype = new BaseExpr();

    VariableReference.prototype.datatype = 'void';

    VariableReference.prototype.show = function(indent) {
        indent = indent || '';
        var t = '';
        t += indent + 'variable: ' + this.name + '\n';
        return t;
    };


    /**
     * class: Literal
     */
    if (!window.Literal && window.defaultConfig)
        window.Literal = null;

    Literal = function(text) {
        this.text = text.substring(1, text.length - 1);
    };

    Literal.parse = function(lexer) {
        var token = lexer.next();
        if (token.length < 2) {
            throw Error('unclosed literal string');
        }
        return new Literal(token)
    };

    Literal.prototype = new BaseExpr();

    Literal.prototype.datatype = 'string';

    Literal.prototype.evaluate = function(ctx) {
        return this.text;
    };

    Literal.prototype.show = function(indent) {
        indent = indent || '';
        var t = '';
        t += indent + 'literal: ' + this.text + '\n';
        return t;
    };


    /**
     * class: Number
     */
    if (!window.Number && window.defaultConfig)
        window.Number = null;

    Number = function(digit) {
        this.digit = +digit;
    };


    Number.parse = function(lexer) {
        return new Number(lexer.next());
    };

    Number.prototype = new BaseExpr();

    Number.prototype.datatype = 'number';

    Number.prototype.evaluate = function(ctx) {
        return this.digit;
    };

    Number.prototype.show = function(indent) {
        indent = indent || '';
        var t = '';
        t += indent + 'number: ' + this.digit + '\n';
        return t;
    };


    /**
     * class: FunctionCall
     */
    if (!window.FunctionCall && window.defaultConfig)
        window.FunctionCall = null;

    FunctionCall = function(name) {
        var info = FunctionCall.funcs[name];
        if (!info)
            throw Error(name +' is not a function');

        this.name = name;
        this.func = info[0];
        this.args = [];

        this.datatype = info[1];

        if (info[2]) {
            this.needContextPosition = true;
        }

        this.needContextNodeInfo = info[3];
        this.needContextNode = this.needContextNodeInfo[0]
    };

    FunctionCall.funcs = {

        // Original Function
        'context-node': [function() {
            if (arguments.length != 0) {
                throw Error('Function context-node expects ()');
            }
            var ns;
            ns = new NodeSet();
            ns.push(this.node);
            return ns;
        }, 'nodeset', false, [true]],

        // Original Function
        'root-node': [function() {
            if (arguments.length != 0) {
                throw Error('Function root-node expects ()');
            }
            var ns, ctxn;
            ns = new NodeSet();
            ctxn = this.node;
            if (ctxn.nodeType == 9)
                ns.push(ctxn);
            else
                ns.push(ctxn.ownerDocument);
            return ns;
        }, 'nodeset', false, []],

        last: [function() {
            if (arguments.length != 0) {
                throw Error('Function last expects ()');
            }
            return this.last;
        }, 'number', true, []],

        position: [function() {
            if (arguments.length != 0) {
                throw Error('Function position expects ()');
            }
            return this.position;
        }, 'number', true, []],

        count: [function(ns) {
            if (arguments.length != 1 || !(ns = ns.evaluate(this)).isNodeSet) {
                throw Error('Function count expects (nodeset)');
            }
            return ns.length;
        }, 'number', false, []],

        id: [function(s) {
            var ids, ns, i, id, elm, ctxn, doc;
            if (arguments.length != 1) {
                throw Error('Function id expects (object)');
            }
            ctxn = this.node;
            if (ctxn.nodeType == 9)
                doc = ctxn;
            else
                doc = ctxn.ownerDocument;
    /*@cc_on
            all = doc.all;
    @*/
            s = s.string(this);
            ids = s.split(/\s+/);
            ns = new NodeSet();
            for (i = 0, l = ids.length; i < l; i ++) {
                id = ids[i];

    /*@cc_on @if (@_jscript)
                elm = all[id];
                if (elm) {
                    if ((!elm.length || elm.nodeType) && id == elm.id) {
                        ns.push(elm)
                    }
                    else if (elm.length) {
                        var elms = elm;
                        for (var j = 0, l0 = elms.length; j < l0; j ++) {
                            var elem = elms[j];
                            if (id == elem.id) {
                                ns.push(elem);
                                break;
                            }
                        }
                    }
                }
    @else @*/
                elm = doc.getElementById(id);
                if (uai.opera && elm && elm.id != id) {
                    var elms = doc.getElementsByName(id);
                    for (var j = 0, l0 = elms.length; j < l0; j ++) {
                        elm = elms[j];
                        if (elm.id == id) {
                            ns.push(elm);
                        }
                    }
                }
                else {
                    if (elm) ns.push(elm)
                }
    /*@end @*/

            }
            ns.isSorted = false;
            return ns;
        }, 'nodeset', false, []],

        'local-name': [function(ns) {
            var nd;
            switch (arguments.length) {
                case 0:
                    nd = this.node;
                    break;
                case 1:
                    if ((ns = ns.evaluate(this)).isNodeSet) {
                        nd = ns.first();
                        break;
                    }
                default:
                    throw Error('Function local-name expects (nodeset?)');
                    break;
            }
            return '' + nd.nodeName.toLowerCase();
        }, 'string', false, [true, false]],

        name: [function(ns) {
            // not implemented
            return FunctionCall.funcs['local-name'][0].apply(this, arguments);
        }, 'string', false, [true, false]],

        'namespace-uri': [function(ns) {
            // not implemented
            return '';
        }, 'string', false, [true, false]],

        string: [function(s) {
            switch (arguments.length) {
                case 0:
                    s = NodeUtil.to('string', this.node);
                    break;
                case 1:
                    s = s.string(this);
                    break;
                default:
                    throw Error('Function string expects (object?)');
                    break;
            }
            return s;
        }, 'string', false, [true, false]],

        concat: [function(s1, s2) {
            if (arguments.length < 2) {
                throw Error('Function concat expects (string, string[, ...])');
            }
            for (var t = '', i = 0, l = arguments.length; i < l; i ++) {
                t += arguments[i].string(this);
            }
            return t;
        }, 'string', false, []],

        'starts-with': [function(s1, s2) {
            if (arguments.length != 2) {
                throw Error('Function starts-with expects (string, string)');
            }
            s1 = s1.string(this);
            s2 = s2.string(this);
            return s1.indexOf(s2) == 0;
        }, 'boolean', false, []],

        contains: [function(s1, s2) {
            if (arguments.length != 2) {
                throw Error('Function contains expects (string, string)');
            }
            s1 = s1.string(this);
            s2 = s2.string(this);
            return s1.indexOf(s2) != -1;
        }, 'boolean', false, []],

        substring: [function(s, n1, n2) {
            var a1, a2;
            s = s.string(this);
            n1 = n1.number(this);
            switch (arguments.length) {
                case 2:
                    n2 = s.length - n1 + 1;
                    break;
                case 3:
                    n2 = n2.number(this);
                    break;
                default:
                    throw Error('Function substring expects (string, string)');
                    break;
            }
            n1 = Math.round(n1);
            n2 = Math.round(n2);
            a1 = n1 - 1;
            a2 = n1 + n2 - 1;
            if (a2 == Infinity) {
                return s.substring(a1 < 0 ? 0 : a1);
            }
            else {
                return s.substring(a1 < 0 ? 0 : a1, a2)
            }
        }, 'string', false, []],

        'substring-before': [function(s1, s2) {
            var n;
            if (arguments.length != 2) {
                throw Error('Function substring-before expects (string, string)');
            }
            s1 = s1.string(this);
            s2 = s2.string(this);
            n = s1.indexOf(s2);
            if (n == -1) return '';
            return s1.substring(0, n);
        }, 'string', false, []],

        'substring-after': [function(s1, s2) {
            if (arguments.length != 2) {
                throw Error('Function substring-after expects (string, string)');
            }
            s1 = s1.string(this);
            s2 = s2.string(this);
            var n = s1.indexOf(s2);
            if (n == -1) return '';
            return s1.substring(n + s2.length);
        }, 'string', false, []],

        'string-length': [function(s) {
            switch (arguments.length) {
                case 0:
                    s = NodeUtil.to('string', this.node);
                    break;
                case 1:
                    s = s.string(this);
                    break;
                default:
                    throw Error('Function string-length expects (string?)');
                    break;
            }
            return s.length;
        }, 'number', false, [true, false]],

        'normalize-space': [function(s) {
            switch (arguments.length) {
                case 0:
                    s = NodeUtil.to('string', this.node);
                    break;
                case 1:
                    s = s.string(this);
                    break;
                default:
                    throw Error('Function normalize-space expects (string?)');
                    break;
            }
            return s.replace(/\s+/g, ' ').replace(/^ /, '').replace(/ $/, '');
        }, 'string', false, [true, false]],

        translate: [function(s1, s2, s3) {
            if (arguments.length != 3) {
                throw Error('Function translate expects (string, string, string)');
            }
            s1 = s1.string(this);
            s2 = s2.string(this);
            s3 = s3.string(this);

            var map = [];
            for (var i = 0, l = s2.length; i < l; i ++) {
                var ch = s2.charAt(i);
                if (!map[ch]) map[ch] = s3.charAt(i) || '';
            }
            for (var t = '', i = 0, l = s1.length; i < l; i ++) {
                var ch = s1.charAt(i);
                var replace = map[ch]
                t += (replace != undefined) ? replace : ch;
            }
            return t;
        }, 'string', false, []],

        'boolean': [function(b) {
            if (arguments.length != 1) {
                throw Error('Function boolean expects (object)');
            }
            return b.bool(this)
        }, 'boolean', false, []],

        not: [function(b) {
            if (arguments.length != 1) {
                throw Error('Function not expects (object)');
            }
            return !b.bool(this)
        }, 'boolean', false, []],

        'true': [function() {
            if (arguments.length != 0) {
                throw Error('Function true expects ()');
            }
            return true;
        }, 'boolean', false, []],

        'false': [function() {
            if (arguments.length != 0) {
                throw Error('Function false expects ()');
            }
            return false;
        }, 'boolean', false, []],

        lang: [function(s) {
            // not implemented
            return false;
        }, 'boolean', false, []],

        number: [function(n) {
            switch (arguments.length) {
                case 0:
                    n = NodeUtil.to('number', this.node);
                    break;
                case 1:
                    n = n.number(this);
                    break;
                default:
                    throw Error('Function number expects (object?)');
                    break;
            }
            return n;
        }, 'number', false, [true, false]],

        sum: [function(ns) {
            var nodes, n, i, l;
            if (arguments.length != 1 || !(ns = ns.evaluate(this)).isNodeSet) {
                throw Error('Function sum expects (nodeset)');
            }
            nodes = ns.list();
            n = 0;
            for (i = 0, l = nodes.length; i < l; i ++) {
                n += NodeUtil.to('number', nodes[i]);
            }
            return n;
        }, 'number', false, []],

        floor: [function(n) {
            if (arguments.length != 1) {
                throw Error('Function floor expects (number)');
            }
            n = n.number(this);
            return Math.floor(n);
        }, 'number', false, []],

        ceiling: [function(n) {
            if (arguments.length != 1) {
                throw Error('Function ceiling expects (number)');
            }
            n = n.number(this);
            return Math.ceil(n);
        }, 'number', false, []],

        round: [function(n) {
            if (arguments.length != 1) {
                throw Error('Function round expects (number)');
            }
            n = n.number(this);
            return Math.round(n);
        }, 'number', false, []]
    };

    FunctionCall.parse = function(lexer) {
        var expr, func = new FunctionCall(lexer.next());
        lexer.next();
        while (lexer.peek() != ')') {
            if (lexer.empty()) {
                throw Error('missing function argument list');
            }
            expr = BinaryExpr.parse(lexer);
            func.arg(expr);
            if (lexer.peek() != ',') break;
            lexer.next();
        }
        if (lexer.empty()) {
            throw Error('unclosed function argument list');
        }
        if (lexer.next() != ')') {
            lexer.back();
            throw Error('bad token: ' + lexer.next());
        }
        return func
    };

    FunctionCall.prototype = new BaseExpr();

    FunctionCall.prototype.evaluate = function (ctx) {
        return this.func.apply(ctx, this.args);
    };

    FunctionCall.prototype.arg = function(arg) {
        this.args.push(arg);

        if (arg.needContextPosition) {
            this.needContextPosition = true;
        }

        var args = this.args;
        if (arg.needContextNode) {
            args.needContexNode = true;
        }
        this.needContextNode = args.needContextNode ||
                                this.needContextNodeInfo[args.length];
    };

    FunctionCall.prototype.show = function(indent) {
        indent = indent || '';
        var t = '';
        t += indent + 'function: ' + this.name + '\n';
        indent += '    ';

        if (this.args.length) {
            t += indent + 'arguments: ' + '\n';
            indent += '    ';
            for (var i = 0; i < this.args.length; i ++) {
                t += this.args[i].show(indent);
            }
        }

        return t;
    };


    /*@cc_on @if (@_jscript)
    var NodeWrapper = function(node, sourceIndex, subIndex, attributeName) {
        this.node = node;
        this.nodeType = node.nodeType;
        this.sourceIndex = sourceIndex;
        this.subIndex = subIndex;
        this.attributeName = attributeName || '';
        this.order = String.fromCharCode(sourceIndex) + String.fromCharCode(subIndex) + attributeName;
    };

    NodeWrapper.prototype.toString = function() {
        return this.order;
    };
    @else @*/
    var NodeID = {
        uuid: 1,
        get: function(node) {
            return node.__jsxpath_id__ || (node.__jsxpath_id__ = this.uuid++);
        }
    };
    /*@end @*/

    if (!window.NodeSet && window.defaultConfig)
        window.NodeSet = null;
        
    NodeSet = function() {
        this.length = 0;
        this.nodes = [];
        this.seen = {};
        this.idIndexMap = null;
        this.reserveDels = [];
    };

    NodeSet.prototype.isNodeSet = true;
    NodeSet.prototype.isSorted = true;

    /*@_cc_on
    NodeSet.prototype.shortcut = true;
    @*/

    NodeSet.prototype.merge = function(nodeset) {
        this.isSorted = false;
        if (nodeset.only) {
            return this.push(nodeset.only);
        }

        if (this.only){
            var only = this.only;
            delete this.only;
            this.push(only);
            this.length --;
        }

        var nodes = nodeset.nodes;
        for (var i = 0, l = nodes.length; i < l; i ++) {
            this._add(nodes[i]);
        }
    };

    NodeSet.prototype.sort = function() {
        if (this.only) return;
        if (this.sortOff) return;

        if (!this.isSorted) {
            this.isSorted = true;
            this.idIndexMap = null;

    /*@cc_on
            if (this.shortcut) {
                this.nodes.sort();
            }
            else {
                this.nodes.sort(function(a, b) {
                    var result;
                    result = a.sourceIndex - b.sourceIndex;
                    if (result == 0)
                        return a.subIndex - a.subIndex;
                    else
                        return result;
                });
            }
            return;
    @*/
            var nodes = this.nodes;
            nodes.sort(function(a, b) {
                if (a == b) return 0;

                if (a.compareDocumentPosition) {
                    var result = a.compareDocumentPosition(b);
                    if (result & 2) return 1;
                    if (result & 4) return -1;
                    return 0;
                }
                else {
                    var node1 = a, node2 = b, ancestor1 = a, ancestor2 = b, deep1 = 0, deep2 = 0;

                    while(ancestor1 = ancestor1.parentNode) deep1 ++;
                    while(ancestor2 = ancestor2.parentNode) deep2 ++;

                    // same deep
                    if (deep1 > deep2) {
                        while (deep1-- != deep2) node1 = node1.parentNode;
                        if (node1 == node2) return 1;
                    }
                    else if (deep2 > deep1) {
                        while (deep2-- != deep1) node2 = node2.parentNode;
                        if (node1 == node2) return -1;
                    }

                    while ((ancestor1 = node1.parentNode) != (ancestor2 = node2.parentNode)) {
                        node1 = ancestor1;
                        node2 = ancestor2;
                    }

                    // node1 is node2's sibling
                    while (node1 = node1.nextSibling) if (node1 == node2) return -1;

                    return 1;
                }
            });
        }
    };


    /*@cc_on @if (@_jscript)
    NodeSet.prototype.sourceOffset = 1;
    NodeSet.prototype.subOffset = 2;
    NodeSet.prototype.createWrapper = function(node) {
        var parent, child, attributes, attributesLength, sourceIndex, subIndex, attributeName;

        sourceIndex = node.sourceIndex;

        if (typeof sourceIndex != 'number') {
            type = node.nodeType;
            switch (type) {
                case 2:
                    parent = node.parentNode;
                    sourceIndex = node.parentSourceIndex;
                    subIndex = -1;
                    attributeName = node.nodeName;
                    break;
                case 9:
                    subIndex = -2;
                    sourceIndex = -1;
                    break;
                default:
                    child = node;
                    subIndex = 0;
                    do {
                        subIndex ++;
                        sourceIndex = child.sourceIndex;
                        if (sourceIndex) {
                            parent = child;
                            child = child.lastChild;
                            if (!child) {
                                child = parent;
                                break;
                            }
                            subIndex ++;
                        }
                    } while (child = child.previousSibling);
                    if (!sourceIndex) {
                        sourceIndex = node.parentNode.sourceIndex;
                    }
                    break;
            }
        }
        else {
            subIndex = -2;
        }

        sourceIndex += this.sourceOffset;
        subIndex += this.subOffset;

        return new NodeWrapper(node, sourceIndex, subIndex, attributeName);
    };

    NodeSet.prototype.reserveDelBySourceIndexAndSubIndex = function(sourceIndex, subIndex, offset, reverse) {
        var map = this.createIdIndexMap();
        var index;
        if ((map = map[sourceIndex]) && (index = map[subIndex])) {
            if (reverse && (this.length - offset - 1) > index || !reverse && offset < index) {
                var obj = {
                    value: index,
                    order: String.fromCharCode(index),
                    toString: function() { return this.order },
                    valueOf: function() { return this.value }
                };
                this.reserveDels.push(obj);
            }
        }
    };
    @else @*/
    NodeSet.prototype.reserveDelByNodeID = function(id, offset, reverse) {
        var map = this.createIdIndexMap();
        var index;
        if (index = map[id]) {
            if (reverse && (this.length - offset - 1) > index || !reverse && offset < index) {
                var obj = {
                    value: index,
                    order: String.fromCharCode(index),
                    toString: function() { return this.order },
                    valueOf: function() { return this.value }
                };
                this.reserveDels.push(obj);
            }
        }
    };
    /*@end @*/

    NodeSet.prototype.reserveDelByNode = function(node, offset, reverse) {
    /*@cc_on @if (@_jscript)
        node = this.createWrapper(node);
        this.reserveDelBySourceIndexAndSubIndex(node.sourceIndex, node.subIndex, offset, reverse);
    @else @*/
        this.reserveDelByNodeID(NodeID.get(node), offset, reverse);
    /*@end @*/
    };

    NodeSet.prototype.doDel = function() {
        if (!this.reserveDels.length) return;

        if (this.length < 0x10000) {
            var dels = this.reserveDels.sort(function(a, b) { return b - a });
        }
        else {
            var dels = this.reserveDels.sort(function(a, b) { return b - a });
        }
        for (var i = 0, l = dels.length; i < l; i ++) {
            this.del(dels[i]);
        }
        this.reserveDels = [];
        this.idIndexMap = null;
    };

    NodeSet.prototype.createIdIndexMap = function() {
        if (this.idIndexMap) {
            return this.idIndexMap;
        }
        else {
            var map = this.idIndexMap = {};
            var nodes = this.nodes;
            for (var i = 0, l = nodes.length; i < l; i ++) {
                var node = nodes[i];
    /*@cc_on @if (@_jscript)
                var sourceIndex = node.sourceIndex;
                var subIndex = node.subIndex;
                if (!map[sourceIndex]) map[sourceIndex] = {};
                map[sourceIndex][subIndex] = i;
    @else @*/
                var id = NodeID.get(node);
                map[id] = i;
    /*@end @*/
            }
            return map;
        }
    };

    NodeSet.prototype.del = function(index) {
        this.length --;
        if (this.only) {
            delete this.only;
        }
        else {  
            var node = this.nodes.splice(index, 1)[0];

            if (this._first == node) {
                delete this._first;
                delete this._firstSourceIndex;
                delete this._firstSubIndex;
            }

    /*@cc_on @if (@_jscript)
            delete this.seen[node.sourceIndex][node.subIndex];
    @else @*/
            delete this.seen[NodeID.get(node)];
    /*@end @*/
        }
    };


    NodeSet.prototype.delDescendant = function(elm, offset) {
        if (this.only) return;
        var nodeType = elm.nodeType;
        if (nodeType != 1 && nodeType != 9) return;
        if (uai.applewebkit2) return;

        // element || document
        if (!elm.contains) {
            if (nodeType == 1) {
                var _elm = elm;
                elm = {
                    contains: function(node) {
                        return node.compareDocumentPosition(_elm) & 8;
                    }
                };
            }
            else {
                // document
                elm = {
                    contains: function() {
                        return true;
                    }
                };
            }
        }

        var nodes = this.nodes;
        for (var i = offset + 1; i < nodes.length; i ++) {

    /*@cc_on @if (@_jscript)
            if (nodes[i].node.nodeType == 1 && elm.contains(nodes[i].node)) {
    @else @*/
            if (elm.contains(nodes[i])) {
    /*@end @*/
                this.del(i);
                i --;
            }
        }
    };

    NodeSet.prototype._add = function(node, reverse) {

    /*@cc_on @if (@_jscript)

        var first, firstSourceIndex, firstSubIndex, sourceIndex, subIndex, attributeName;

        sourceIndex = node.sourceIndex;
        subIndex = node.subIndex;
        attributeName = node.attributeName;
        seen = this.seen;

        seen = seen[sourceIndex] || (seen[sourceIndex] = {});

        if (node.nodeType == 2) {
            seen = seen[subIndex] || (seen[subIndex] = {});
            if (seen[attributeName]) {
                return true;
            }
            seen[attributeName] = true;
        }
        else {
            if (seen[subIndex]) {
                return true;
            }
            seen[subIndex] = true;
        }

        if (sourceIndex >= 0x10000 || subIndex >= 0x10000) {
            this.shortcut = false;
        }

        // if this._first is undefined and this.nodes is not empty
        // then first node shortcut is disabled.
        if (this._first || this.nodes.length == 0) {
            first = this._first;
            firstSourceIndex = this._firstSourceIndex;
            firstSubIndex = this._firstSubIndex;
            if (!first || firstSourceIndex > sourceIndex || (firstSourceIndex == sourceIndex && firstSubIndex > subIndex)) {
                this._first = node;
                this._firstSourceIndex = sourceIndex;
                this._firstSubIndex = subIndex
            }
        }

    @else @*/

        var seen = this.seen;
        var id = NodeID.get(node);
        if (seen[id]) return true;
        seen[id] = true;

    /*@end @*/

        this.length++;
        if (reverse) 
            this.nodes.unshift(node);
        else
            this.nodes.push(node);
    };


    NodeSet.prototype.unshift = function(node) {
        if (!this.length) {
            this.length ++;
            this.only = node;
            return
        }
        if (this.only){
            var only = this.only;
            delete this.only;
            this.unshift(only);
            this.length --;
        }
    /*@cc_on
        node = this.createWrapper(node);
    @*/
        return this._add(node, true);
    };


    NodeSet.prototype.push = function(node) {
        if (!this.length) {
            this.length ++;
            this.only = node;
            return;
        }
        if (this.only) {
            var only = this.only;
            delete this.only;
            this.push(only);
            this.length --;
        }
    /*@cc_on
        node = this.createWrapper(node);
    @*/
        return this._add(node);
    };

    NodeSet.prototype.first = function() {
        if (this.only) return this.only;
    /*@cc_on
        if (this._first) return this._first.node;
        if (this.nodes.length > 1) this.sort();
        var node = this.nodes[0];
        return node ? node.node : undefined;
    @*/
        if (this.nodes.length > 1) this.sort();
        return this.nodes[0];
    };

    NodeSet.prototype.list = function() {
        if (this.only) return [this.only];
        this.sort();
    /*@cc_on
        var i, l, nodes, results;
        nodes = this.nodes;
        results = [];
        for (i = 0, l = nodes.length; i < l; i ++) {
            results.push(nodes[i].node);
        }
        return results;
    @*/
        return this.nodes;
    };

    NodeSet.prototype.string = function() {
        var node = this.only || this.first();
        return node ? NodeUtil.to('string', node) : '';
    };

    NodeSet.prototype.bool = function() {
        return !! (this.length || this.only);
    };

    NodeSet.prototype.number = function() {
        return + this.string();
    };

    NodeSet.prototype.iterator = function(reverse) {
        this.sort();
        var nodeset = this;

        if (!reverse) {
            var count = 0;
            return function() {
                if (nodeset.only && count++ == 0) return nodeset.only;
    /*@cc_on @if(@_jscript)
                var wrapper = nodeset.nodes[count++];
                if (wrapper) return wrapper.node;
                return undefined;
    @else @*/
                return nodeset.nodes[count++];
    /*@end @*/
            };
        }
        else {
            var count = 0;
            return function() {
                var index = nodeset.length - (count++) - 1;
                if (nodeset.only && index == 0) return nodeset.only;
    /*@cc_on @if(@_jscript)
                var wrapper = nodeset.nodes[index];
                if (wrapper) return wrapper.node;
                return undefined;
    @else @*/
                return nodeset.nodes[index];
    /*@end @*/
            };
        }
    };


    var install = function(win) {

        win = win || this;
        var doc = win.document;
        var undefined = win.undefined;

        win.XPathExpression = function(expr) {
            if (!expr.length) {
                throw win.Error('no expression');
            }
            var lexer = this.lexer = Lexer(expr);
            if (lexer.empty()) {
                throw win.Error('no expression');
            }
            this.expr = BinaryExpr.parse(lexer);
            if (!lexer.empty()) {
                throw win.Error('bad token: ' + lexer.next());
            }
        };
        
        win.XPathExpression.prototype.evaluate = function(node, type) {
            return new win.XPathResult(this.expr.evaluate(new Ctx(node)), type);
        };
        
        win.XPathResult = function (value, type) {
            if (type == 0) {
                switch (typeof value) {
                    case 'object':  type ++; // 4
                    case 'boolean': type ++; // 3
                    case 'string':  type ++; // 2
                    case 'number':  type ++; // 1
                }
            }
        
            this.resultType = type;
        
            switch (type) {
                case 1:
                    this.numberValue = value.isNodeSet ? value.number() : +value;
                    return;
                case 2:
                    this.stringValue = value.isNodeSet ? value.string() : '' + value;
                    return;
                case 3:
                    this.booleanValue = value.isNodeSet ? value.bool() : !! value;
                    return;
                case 4: case 5: case 6: case 7:
                    this.nodes = value.list();
                    this.snapshotLength = value.length;
                    this.index = 0;
                    this.invalidIteratorState = false;
                    break;
                case 8: case 9:
                    this.singleNodeValue = value.first();
                    return;
            }
        };
        
        win.XPathResult.prototype.iterateNext = function() { return this.nodes[this.index++] };
        win.XPathResult.prototype.snapshotItem = function(i) { return this.nodes[i] };
        
        win.XPathResult.ANY_TYPE = 0;
        win.XPathResult.NUMBER_TYPE = 1;
        win.XPathResult.STRING_TYPE = 2;
        win.XPathResult.BOOLEAN_TYPE = 3;
        win.XPathResult.UNORDERED_NODE_ITERATOR_TYPE = 4;
        win.XPathResult.ORDERED_NODE_ITERATOR_TYPE = 5;
        win.XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE = 6;
        win.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE = 7;
        win.XPathResult.ANY_UNORDERED_NODE_TYPE = 8;
        win.XPathResult.FIRST_ORDERED_NODE_TYPE = 9;
        
        
        doc.createExpression = function(expr) {
            return new win.XPathExpression(expr, null);
        };
        
        doc.evaluate = function(expr, context, _, type) {
            return doc.createExpression(expr, null).evaluate(context, type || win.XPathResult.ANY_TYPE);
        };
    };

    var win;

    if (config.targetFrame) {
        var frame = document.getElementById(config.targetFrame);
        if (frame) win = frame.contentWindow;
    }

    if (config.exportInstaller) {
        window.install = install;
    }

    if (!config.hasNative || !config.useNative) {
        install(win || window);
    }
    };

};

// Thanks for reading this source code. We love JavaScript.


if (typeof(_qtp_inject_css) == "undefined" || _qtp_inject_css == true)
{
    /*!
     * Sizzle CSS Selector Engine - v1.0
     *  Copyright 2009, The Dojo Foundation
     *  Released under the MIT, BSD, and GPL Licenses.
     *  More information: http://sizzlejs.com/
     */
     qtpProps.SizzleInjector = function()
     {
    (function(){

    var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]*\]|['"][^'"]*['"]|[^[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?/g,
        done = 0,
        toString = Object.prototype.toString,
        hasDuplicate = false;

    var Sizzle = function(selector, context, results, seed) {
        results = results || [];
        var origContext = context = context || document;

        if ( context.nodeType !== 1 && context.nodeType !== 9 ) {
	        return [];
        }
    	
        if ( !selector || typeof selector !== "string" ) {
	        return results;
        }

        var parts = [], m, set, checkSet, check, mode, extra, prune = true, contextXML = isXML(context);
    	
        // Reset the position of the chunker regexp (start from head)
        chunker.lastIndex = 0;
    	
        while ( (m = chunker.exec(selector)) !== null ) {
	        parts.push( m[1] );
    		
	        if ( m[2] ) {
		        extra = RegExp.rightContext;
		        break;
	        }
        }

        if ( parts.length > 1 && origPOS.exec( selector ) ) {
	        if ( parts.length === 2 && Expr.relative[ parts[0] ] ) {
		        set = posProcess( parts[0] + parts[1], context );
	        } else {
		        set = Expr.relative[ parts[0] ] ?
			        [ context ] :
			        Sizzle( parts.shift(), context );

		        while ( parts.length ) {
			        selector = parts.shift();

			        if ( Expr.relative[ selector ] )
				        selector += parts.shift();

			        set = posProcess( selector, set );
		        }
	        }
        } else {
	        // Take a shortcut and set the context if the root selector is an ID
	        // (but not if it'll be faster if the inner selector is an ID)
	        if ( !seed && parts.length > 1 && context.nodeType === 9 && !contextXML &&
			        Expr.match.ID.test(parts[0]) && !Expr.match.ID.test(parts[parts.length - 1]) ) {
		        var ret = Sizzle.find( parts.shift(), context, contextXML );
		        context = ret.expr ? Sizzle.filter( ret.expr, ret.set )[0] : ret.set[0];
	        }

	        if ( context ) {
		        var ret = seed ?
			        { expr: parts.pop(), set: makeArray(seed) } :
			        Sizzle.find( parts.pop(), parts.length === 1 && (parts[0] === "~" || parts[0] === "+") && context.parentNode ? context.parentNode : context, contextXML );
		        set = ret.expr ? Sizzle.filter( ret.expr, ret.set ) : ret.set;

		        if ( parts.length > 0 ) {
			        checkSet = makeArray(set);
		        } else {
			        prune = false;
		        }

		        while ( parts.length ) {
			        var cur = parts.pop(), pop = cur;

			        if ( !Expr.relative[ cur ] ) {
				        cur = "";
			        } else {
				        pop = parts.pop();
			        }

			        if ( pop == null ) {
				        pop = context;
			        }

			        Expr.relative[ cur ]( checkSet, pop, contextXML );
		        }
	        } else {
		        checkSet = parts = [];
	        }
        }

        if ( !checkSet ) {
	        checkSet = set;
        }

        if ( !checkSet ) {
	        throw "Syntax error, unrecognized expression: " + (cur || selector);
        }

        if ( toString.call(checkSet) === "[object Array]" ) {
	        if ( !prune ) {
		        results.push.apply( results, checkSet );
	        } else if ( context && context.nodeType === 1 ) {
		        for ( var i = 0; checkSet[i] != null; i++ ) {
			        if ( checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && contains(context, checkSet[i])) ) {
				        results.push( set[i] );
			        }
		        }
	        } else {
		        for ( var i = 0; checkSet[i] != null; i++ ) {
			        if ( checkSet[i] && checkSet[i].nodeType === 1 ) {
				        results.push( set[i] );
			        }
		        }
	        }
        } else {
	        makeArray( checkSet, results );
        }

        if ( extra ) {
	        Sizzle( extra, origContext, results, seed );
	        Sizzle.uniqueSort( results );
        }

        return results;
    };

    Sizzle.uniqueSort = function(results){
        if ( sortOrder ) {
	        hasDuplicate = false;
	        results.sort(sortOrder);

	        if ( hasDuplicate ) {
		        for ( var i = 1; i < results.length; i++ ) {
			        if ( results[i] === results[i-1] ) {
				        results.splice(i--, 1);
			        }
		        }
	        }
        }
    };

    Sizzle.matches = function(expr, set){
        return Sizzle(expr, null, null, set);
    };

    Sizzle.find = function(expr, context, isXML){
        var set, match;

        if ( !expr ) {
	        return [];
        }

        for ( var i = 0, l = Expr.order.length; i < l; i++ ) {
	        var type = Expr.order[i], match;
    		
	        if ( (match = Expr.match[ type ].exec( expr )) ) {
		        var left = RegExp.leftContext;

		        if ( left.substr( left.length - 1 ) !== "\\" ) {
			        match[1] = (match[1] || "").replace(/\\/g, "");
			        set = Expr.find[ type ]( match, context, isXML );
			        if ( set != null ) {
				        expr = expr.replace( Expr.match[ type ], "" );
				        break;
			        }
		        }
	        }
        }

        if ( !set ) {
	        set = context.getElementsByTagName("*");
        }

        return {set: set, expr: expr};
    };

    Sizzle.filter = function(expr, set, inplace, not){
        var old = expr, result = [], curLoop = set, match, anyFound,
	        isXMLFilter = set && set[0] && isXML(set[0]);

        while ( expr && set.length ) {
	        for ( var type in Expr.filter ) {
		        if ( (match = Expr.match[ type ].exec( expr )) != null ) {
			        var filter = Expr.filter[ type ], found, item;
			        anyFound = false;

			        if ( curLoop == result ) {
				        result = [];
			        }

			        if ( Expr.preFilter[ type ] ) {
				        match = Expr.preFilter[ type ]( match, curLoop, inplace, result, not, isXMLFilter );

				        if ( !match ) {
					        anyFound = found = true;
				        } else if ( match === true ) {
					        continue;
				        }
			        }

			        if ( match ) {
				        for ( var i = 0; (item = curLoop[i]) != null; i++ ) {
					        if ( item ) {
						        found = filter( item, match, i, curLoop );
						        var pass = not ^ !!found;

						        if ( inplace && found != null ) {
							        if ( pass ) {
								        anyFound = true;
							        } else {
								        curLoop[i] = false;
							        }
						        } else if ( pass ) {
							        result.push( item );
							        anyFound = true;
						        }
					        }
				        }
			        }

			        if ( found !== undefined ) {
				        if ( !inplace ) {
					        curLoop = result;
				        }

				        expr = expr.replace( Expr.match[ type ], "" );

				        if ( !anyFound ) {
					        return [];
				        }

				        break;
			        }
		        }
	        }

	        // Improper expression
	        if ( expr == old ) {
		        if ( anyFound == null ) {
			        throw "Syntax error, unrecognized expression: " + expr;
		        } else {
			        break;
		        }
	        }

	        old = expr;
        }

        return curLoop;
    };


    var Expr = Sizzle.selectors = {
        order: [ "ID", "NAME", "TAG" ],
        match: {
	        ID: /#((?:[\w\u00c0-\uFFFF_-]|\\.)+)/,
	        CLASS: /\.((?:[\w\u00c0-\uFFFF_-]|\\.)+)/,
	        NAME: /\[name=['"]*((?:[\w\u00c0-\uFFFF_-]|\\.)+)['"]*\]/,
	        ATTR: /\[\s*((?:[\w\u00c0-\uFFFF_-]|\\.)+)\s*(?:(\S?=)\s*(['"]*)(.*?)\3|)\s*\]/,
	        TAG: /^((?:[\w\u00c0-\uFFFF\*_-]|\\.)+)/,
	        CHILD: /:(only|nth|last|first)-child(?:\((even|odd|[\dn+-]*)\))?/,
	        POS: /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^-]|$)/,
	        PSEUDO: /:((?:[\w\u00c0-\uFFFF_-]|\\.)+)(?:\((['"]*)((?:\([^\)]+\)|[^\2\(\)]*)+)\2\))?/
        },
        attrMap: {
	        "class": "className",
	        "for": "htmlFor"
        },
        attrHandle: {
	        href: function(elem){
		        return elem.getAttribute("href");
	        }
        },
        relative: {
	        "+": function(checkSet, part, isXML){
		        var isPartStr = typeof part === "string",
			        isTag = isPartStr && !/\W/.test(part),
			        isPartStrNotTag = isPartStr && !isTag;

		        if ( isTag && !isXML ) {
			        part = part.toUpperCase();
		        }

		        for ( var i = 0, l = checkSet.length, elem; i < l; i++ ) {
			        if ( (elem = checkSet[i]) ) {
				        while ( (elem = elem.previousSibling) && elem.nodeType !== 1 ) {}

				        checkSet[i] = isPartStrNotTag || elem && elem.nodeName === part ?
					        elem || false :
					        elem === part;
			        }
		        }

		        if ( isPartStrNotTag ) {
			        Sizzle.filter( part, checkSet, true );
		        }
	        },
	        ">": function(checkSet, part, isXML){
		        var isPartStr = typeof part === "string";

		        if ( isPartStr && !/\W/.test(part) ) {
			        part = isXML ? part : part.toUpperCase();

			        for ( var i = 0, l = checkSet.length; i < l; i++ ) {
				        var elem = checkSet[i];
				        if ( elem ) {
					        var parent = elem.parentNode;
					        checkSet[i] = parent.nodeName === part ? parent : false;
				        }
			        }
		        } else {
			        for ( var i = 0, l = checkSet.length; i < l; i++ ) {
				        var elem = checkSet[i];
				        if ( elem ) {
					        checkSet[i] = isPartStr ?
						        elem.parentNode :
						        elem.parentNode === part;
				        }
			        }

			        if ( isPartStr ) {
				        Sizzle.filter( part, checkSet, true );
			        }
		        }
	        },
	        "": function(checkSet, part, isXML){
		        var doneName = done++, checkFn = dirCheck;

		        if ( !part.match(/\W/) ) {
			        var nodeCheck = part = isXML ? part : part.toUpperCase();
			        checkFn = dirNodeCheck;
		        }

		        checkFn("parentNode", part, doneName, checkSet, nodeCheck, isXML);
	        },
	        "~": function(checkSet, part, isXML){
		        var doneName = done++, checkFn = dirCheck;

		        if ( typeof part === "string" && !part.match(/\W/) ) {
			        var nodeCheck = part = isXML ? part : part.toUpperCase();
			        checkFn = dirNodeCheck;
		        }

		        checkFn("previousSibling", part, doneName, checkSet, nodeCheck, isXML);
	        }
        },
        find: {
	        ID: function(match, context, isXML){
		        if ( typeof context.getElementById !== "undefined" && !isXML ) {
			        var m = context.getElementById(match[1]);
			        return m ? [m] : [];
		        }
	        },
	        NAME: function(match, context, isXML){
		        if ( typeof context.getElementsByName !== "undefined" ) {
			        var ret = [], results = context.getElementsByName(match[1]);

			        for ( var i = 0, l = results.length; i < l; i++ ) {
				        if ( results[i].getAttribute("name") === match[1] ) {
					        ret.push( results[i] );
				        }
			        }

			        return ret.length === 0 ? null : ret;
		        }
	        },
	        TAG: function(match, context){
		        return context.getElementsByTagName(match[1]);
	        }
        },
        preFilter: {
	        CLASS: function(match, curLoop, inplace, result, not, isXML){
		        match = " " + match[1].replace(/\\/g, "") + " ";

		        if ( isXML ) {
			        return match;
		        }

		        for ( var i = 0, elem; (elem = curLoop[i]) != null; i++ ) {
			        if ( elem ) {
				        if ( not ^ (elem.className && (" " + elem.className + " ").indexOf(match) >= 0) ) {
					        if ( !inplace )
						        result.push( elem );
				        } else if ( inplace ) {
					        curLoop[i] = false;
				        }
			        }
		        }

		        return false;
	        },
	        ID: function(match){
		        return match[1].replace(/\\/g, "");
	        },
	        TAG: function(match, curLoop){
		        for ( var i = 0; curLoop[i] === false; i++ ){}
		        return curLoop[i] && isXML(curLoop[i]) ? match[1] : match[1].toUpperCase();
	        },
	        CHILD: function(match){
		        if ( match[1] == "nth" ) {
			        // parse equations like 'even', 'odd', '5', '2n', '3n+2', '4n-1', '-n+6'
			        var test = /(-?)(\d*)n((?:\+|-)?\d*)/.exec(
				        match[2] == "even" && "2n" || match[2] == "odd" && "2n+1" ||
				        !/\D/.test( match[2] ) && "0n+" + match[2] || match[2]);

			        // calculate the numbers (first)n+(last) including if they are negative
			        match[2] = (test[1] + (test[2] || 1)) - 0;
			        match[3] = test[3] - 0;
		        }

		        // TODO: Move to normal caching system
		        match[0] = done++;

		        return match;
	        },
	        ATTR: function(match, curLoop, inplace, result, not, isXML){
		        var name = match[1].replace(/\\/g, "");
    			
		        if ( !isXML && Expr.attrMap[name] ) {
			        match[1] = Expr.attrMap[name];
		        }

		        if ( match[2] === "~=" ) {
			        match[4] = " " + match[4] + " ";
		        }

		        return match;
	        },
	        PSEUDO: function(match, curLoop, inplace, result, not){
		        if ( match[1] === "not" ) {
			        // If we're dealing with a complex expression, or a simple one
			        if ( match[3].match(chunker).length > 1 || /^\w/.test(match[3]) ) {
				        match[3] = Sizzle(match[3], null, null, curLoop);
			        } else {
				        var ret = Sizzle.filter(match[3], curLoop, inplace, true ^ not);
				        if ( !inplace ) {
					        result.push.apply( result, ret );
				        }
				        return false;
			        }
		        } else if ( Expr.match.POS.test( match[0] ) || Expr.match.CHILD.test( match[0] ) ) {
			        return true;
		        }
    			
		        return match;
	        },
	        POS: function(match){
		        match.unshift( true );
		        return match;
	        }
        },
        filters: {
	        enabled: function(elem){
		        return elem.disabled === false && elem.type !== "hidden";
	        },
	        disabled: function(elem){
		        return elem.disabled === true;
	        },
	        checked: function(elem){
		        return elem.checked === true;
	        },
	        selected: function(elem){
		        // Accessing this property makes selected-by-default
		        // options in Safari work properly
		        elem.parentNode.selectedIndex;
		        return elem.selected === true;
	        },
	        parent: function(elem){
		        return !!elem.firstChild;
	        },
	        empty: function(elem){
		        return !elem.firstChild;
	        },
	        has: function(elem, i, match){
		        return !!Sizzle( match[3], elem ).length;
	        },
	        header: function(elem){
		        return /h\d/i.test( elem.nodeName );
	        },
	        text: function(elem){
		        return "text" === elem.type;
	        },
	        radio: function(elem){
		        return "radio" === elem.type;
	        },
	        checkbox: function(elem){
		        return "checkbox" === elem.type;
	        },
	        file: function(elem){
		        return "file" === elem.type;
	        },
	        password: function(elem){
		        return "password" === elem.type;
	        },
	        submit: function(elem){
		        return "submit" === elem.type;
	        },
	        image: function(elem){
		        return "image" === elem.type;
	        },
	        reset: function(elem){
		        return "reset" === elem.type;
	        },
	        button: function(elem){
		        return "button" === elem.type || elem.nodeName.toUpperCase() === "BUTTON";
	        },
	        input: function(elem){
		        return /input|select|textarea|button/i.test(elem.nodeName);
	        }
        },
        setFilters: {
	        first: function(elem, i){
		        return i === 0;
	        },
	        last: function(elem, i, match, array){
		        return i === array.length - 1;
	        },
	        even: function(elem, i){
		        return i % 2 === 0;
	        },
	        odd: function(elem, i){
		        return i % 2 === 1;
	        },
	        lt: function(elem, i, match){
		        return i < match[3] - 0;
	        },
	        gt: function(elem, i, match){
		        return i > match[3] - 0;
	        },
	        nth: function(elem, i, match){
		        return match[3] - 0 == i;
	        },
	        eq: function(elem, i, match){
		        return match[3] - 0 == i;
	        }
        },
        filter: {
	        PSEUDO: function(elem, match, i, array){
		        var name = match[1], filter = Expr.filters[ name ];

		        if ( filter ) {
			        return filter( elem, i, match, array );
		        } else if ( name === "contains" ) {
			        return (elem.textContent || elem.innerText || "").indexOf(match[3]) >= 0;
		        } else if ( name === "not" ) {
			        var not = match[3];

			        for ( i = 0, l = not.length; i < l; i++ ) {
				        if ( not[i] === elem ) {
					        return false;
				        }
			        }

			        return true;
		        }
	        },
	        CHILD: function(elem, match){
		        var type = match[1], node = elem;
		        switch (type) {
			        case 'only':
			        case 'first':
				        while ( (node = node.previousSibling) )  {
					        if ( node.nodeType === 1 ) return false;
				        }
				        if ( type == 'first') return true;
				        node = elem;
			        case 'last':
				        while ( (node = node.nextSibling) )  {
					        if ( node.nodeType === 1 ) return false;
				        }
				        return true;
			        case 'nth':
				        var first = match[2], last = match[3];

				        if ( first == 1 && last == 0 ) {
					        return true;
				        }
    					
				        var doneName = match[0],
					        parent = elem.parentNode;
    	
				        if ( parent && (parent.sizcache !== doneName || !elem.nodeIndex) ) {
					        var count = 0;
					        for ( node = parent.firstChild; node; node = node.nextSibling ) {
						        if ( node.nodeType === 1 ) {
							        node.nodeIndex = ++count;
						        }
					        } 
					        parent.sizcache = doneName;
				        }
    					
				        var diff = elem.nodeIndex - last;
				        if ( first == 0 ) {
					        return diff == 0;
				        } else {
					        return ( diff % first == 0 && diff / first >= 0 );
				        }
		        }
	        },
	        ID: function(elem, match){
		        return elem.nodeType === 1 && elem.getAttribute("id") === match;
	        },
	        TAG: function(elem, match){
		        return (match === "*" && elem.nodeType === 1) || elem.nodeName === match;
	        },
	        CLASS: function(elem, match){
		        return (" " + (elem.className || elem.getAttribute("class")) + " ")
			        .indexOf( match ) > -1;
	        },
	        ATTR: function(elem, match){
		        var name = match[1],
			        result = Expr.attrHandle[ name ] ?
				        Expr.attrHandle[ name ]( elem ) :
				        elem[ name ] != null ?
					        elem[ name ] :
					        elem.getAttribute( name ),
			        value = result + "",
			        type = match[2],
			        check = match[4];

		        return result == null ?
			        type === "!=" :
			        type === "=" ?
			        value === check :
			        type === "*=" ?
			        value.indexOf(check) >= 0 :
			        type === "~=" ?
			        (" " + value + " ").indexOf(check) >= 0 :
			        !check ?
			        value && result !== false :
			        type === "!=" ?
			        value != check :
			        type === "^=" ?
			        value.indexOf(check) === 0 :
			        type === "$=" ?
			        value.substr(value.length - check.length) === check :
			        type === "|=" ?
			        value === check || value.substr(0, check.length + 1) === check + "-" :
			        false;
	        },
	        POS: function(elem, match, i, array){
		        var name = match[2], filter = Expr.setFilters[ name ];

		        if ( filter ) {
			        return filter( elem, i, match, array );
		        }
	        }
        }
    };

    var origPOS = Expr.match.POS;

    for ( var type in Expr.match ) {
        Expr.match[ type ] = new RegExp( Expr.match[ type ].source + /(?![^\[]*\])(?![^\(]*\))/.source );
    }

    var makeArray = function(array, results) {
        array = Array.prototype.slice.call( array );

        if ( results ) {
	        results.push.apply( results, array );
	        return results;
        }
    	
        return array;
    };

    // Perform a simple check to determine if the browser is capable of
    // converting a NodeList to an array using builtin methods.
    try {
        Array.prototype.slice.call( document.documentElement.childNodes );

    // Provide a fallback method if it does not work
    } catch(e){
        makeArray = function(array, results) {
	        var ret = results || [];

	        if ( toString.call(array) === "[object Array]" ) {
		        Array.prototype.push.apply( ret, array );
	        } else {
		        if ( typeof array.length === "number" ) {
			        for ( var i = 0, l = array.length; i < l; i++ ) {
				        ret.push( array[i] );
			        }
		        } else {
			        for ( var i = 0; array[i]; i++ ) {
				        ret.push( array[i] );
			        }
		        }
	        }

	        return ret;
        };
    }

    var sortOrder;

    if ( document.documentElement.compareDocumentPosition ) {
        sortOrder = function( a, b ) {
	        var ret = a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
	        if ( ret === 0 ) {
		        hasDuplicate = true;
	        }
	        return ret;
        };
    } else if ( "sourceIndex" in document.documentElement ) {
        sortOrder = function( a, b ) {
	        var ret = a.sourceIndex - b.sourceIndex;
	        if ( ret === 0 ) {
		        hasDuplicate = true;
	        }
	        return ret;
        };
    } else if ( document.createRange ) {
        sortOrder = function( a, b ) {
	        var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
	        aRange.selectNode(a);
	        aRange.collapse(true);
	        bRange.selectNode(b);
	        bRange.collapse(true);
	        var ret = aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
	        if ( ret === 0 ) {
		        hasDuplicate = true;
	        }
	        return ret;
        };
    }

    // Check to see if the browser returns elements by name when
    // querying by getElementById (and provide a workaround)
    (function(){
        // We're going to inject a fake input element with a specified name
        var form = document.createElement("div"),
	        id = "script" + (new Date).getTime();
        form.innerHTML = "<a name='" + id + "'/>";

        // Inject it into the root element, check its status, and remove it quickly
        var root = document.documentElement;
        root.insertBefore( form, root.firstChild );

        // The workaround has to do additional checks after a getElementById
        // Which slows things down for other browsers (hence the branching)
        if ( !!document.getElementById( id ) ) {
	        Expr.find.ID = function(match, context, isXML){
		        if ( typeof context.getElementById !== "undefined" && !isXML ) {
			        var m = context.getElementById(match[1]);
			        return m ? m.id === match[1] || typeof m.getAttributeNode !== "undefined" && m.getAttributeNode("id").nodeValue === match[1] ? [m] : undefined : [];
		        }
	        };

	        Expr.filter.ID = function(elem, match){
		        var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
		        return elem.nodeType === 1 && node && node.nodeValue === match;
	        };
        }

        root.removeChild( form );
        root = form = null; // release memory in IE
    })();

    (function(){
        // Check to see if the browser returns only elements
        // when doing getElementsByTagName("*")

        // Create a fake element
        var div = document.createElement("div");
        div.appendChild( document.createComment("") );

        // Make sure no comments are found
        if ( div.getElementsByTagName("*").length > 0 ) {
	        Expr.find.TAG = function(match, context){
		        var results = context.getElementsByTagName(match[1]);

		        // Filter out possible comments
		        if ( match[1] === "*" ) {
			        var tmp = [];

			        for ( var i = 0; results[i]; i++ ) {
				        if ( results[i].nodeType === 1 ) {
					        tmp.push( results[i] );
				        }
			        }

			        results = tmp;
		        }

		        return results;
	        };
        }

        // Check to see if an attribute returns normalized href attributes
        div.innerHTML = "<a href='#'></a>";
        if ( div.firstChild && typeof div.firstChild.getAttribute !== "undefined" &&
		        div.firstChild.getAttribute("href") !== "#" ) {
	        Expr.attrHandle.href = function(elem){
		        return elem.getAttribute("href", 2);
	        };
        }

        div = null; // release memory in IE
    })();

    if ( document.querySelectorAll ) (function(){
        var oldSizzle = Sizzle, div = document.createElement("div");
        div.innerHTML = "<p class='TEST'></p>";

        // Safari can't handle uppercase or unicode characters when
        // in quirks mode.
        if ( div.querySelectorAll && div.querySelectorAll(".TEST").length === 0 ) {
	        return;
        }
    	
        Sizzle = function(query, context, extra, seed){
	        context = context || document;

	        // Only use querySelectorAll on non-XML documents
	        // (ID selectors don't work in non-HTML documents)
	        if ( !seed && context.nodeType === 9 && !isXML(context) ) {
		        try {
			        return makeArray( context.querySelectorAll(query), extra );
		        } catch(e){}
	        }
    		
	        return oldSizzle(query, context, extra, seed);
        };

        for ( var prop in oldSizzle ) {
	        Sizzle[ prop ] = oldSizzle[ prop ];
        }

        div = null; // release memory in IE
    })();

    if ( document.getElementsByClassName && document.documentElement.getElementsByClassName ) (function(){
        var div = document.createElement("div");
        div.innerHTML = "<div class='test e'></div><div class='test'></div>";

        // Opera can't find a second classname (in 9.6)
        if ( div.getElementsByClassName("e").length === 0 )
	        return;

        // Safari caches class attributes, doesn't catch changes (in 3.2)
        div.lastChild.className = "e";

        if ( div.getElementsByClassName("e").length === 1 )
	        return;

        Expr.order.splice(1, 0, "CLASS");
        Expr.find.CLASS = function(match, context, isXML) {
	        if ( typeof context.getElementsByClassName !== "undefined" && !isXML ) {
		        return context.getElementsByClassName(match[1]);
	        }
        };

        div = null; // release memory in IE
    })();

    function dirNodeCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
        var sibDir = dir == "previousSibling" && !isXML;
        for ( var i = 0, l = checkSet.length; i < l; i++ ) {
	        var elem = checkSet[i];
	        if ( elem ) {
		        if ( sibDir && elem.nodeType === 1 ){
			        elem.sizcache = doneName;
			        elem.sizset = i;
		        }
		        elem = elem[dir];
		        var match = false;

		        while ( elem ) {
			        if ( elem.sizcache === doneName ) {
				        match = checkSet[elem.sizset];
				        break;
			        }

			        if ( elem.nodeType === 1 && !isXML ){
				        elem.sizcache = doneName;
				        elem.sizset = i;
			        }

			        if ( elem.nodeName === cur ) {
				        match = elem;
				        break;
			        }

			        elem = elem[dir];
		        }

		        checkSet[i] = match;
	        }
        }
    }

    function dirCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
        var sibDir = dir == "previousSibling" && !isXML;
        for ( var i = 0, l = checkSet.length; i < l; i++ ) {
	        var elem = checkSet[i];
	        if ( elem ) {
		        if ( sibDir && elem.nodeType === 1 ) {
			        elem.sizcache = doneName;
			        elem.sizset = i;
		        }
		        elem = elem[dir];
		        var match = false;

		        while ( elem ) {
			        if ( elem.sizcache === doneName ) {
				        match = checkSet[elem.sizset];
				        break;
			        }

			        if ( elem.nodeType === 1 ) {
				        if ( !isXML ) {
					        elem.sizcache = doneName;
					        elem.sizset = i;
				        }
				        if ( typeof cur !== "string" ) {
					        if ( elem === cur ) {
						        match = true;
						        break;
					        }

				        } else if ( Sizzle.filter( cur, [elem] ).length > 0 ) {
					        match = elem;
					        break;
				        }
			        }

			        elem = elem[dir];
		        }

		        checkSet[i] = match;
	        }
        }
    }

    var contains = document.compareDocumentPosition ?  function(a, b){
        return a.compareDocumentPosition(b) & 16;
    } : function(a, b){
        return a !== b && (a.contains ? a.contains(b) : true);
    };

    var isXML = function(elem){
        return elem.nodeType === 9 && elem.documentElement.nodeName !== "HTML" ||
	        !!elem.ownerDocument && elem.ownerDocument.documentElement.nodeName !== "HTML";
    };

    var posProcess = function(selector, context){
        var tmpSet = [], later = "", match,
	        root = context.nodeType ? [context] : context;

        // Position selectors must be done after the filter
        // And so must :not(positional) so we move all PSEUDOs to the end
        while ( (match = Expr.match.PSEUDO.exec( selector )) ) {
	        later += match[0];
	        selector = selector.replace( Expr.match.PSEUDO, "" );
        }

        selector = Expr.relative[selector] ? selector + "*" : selector;

        for ( var i = 0, l = root.length; i < l; i++ ) {
	        Sizzle( selector, root[i], tmpSet );
        }

        return Sizzle.filter( later, tmpSet );
    };

    // EXPOSE

    window.Sizzle = Sizzle;

    })();

    qtpProps.Sizzle = window.Sizzle;
    };
};
var finder = {
    css: function(specifier, context) {
	    var retVal = [];
	    try {
                if (  typeof(GlobalNSResolver) != "undefined")
                    document = GlobalNSResolver.document;
                else	
                    document = qtpProps.wnd.document;

	        if (!qtpProps.Sizzle)
	        {
	            qtpProps.SizzleInjector();
	        }
	        
            var elems = qtpProps.Sizzle(specifier,context);
   	        for (var i = 0; i < elems.length; i++)
		        retVal.push(elems[i]);
   		}
		finally {
			document = null;
		}
	    return retVal;
    },
    xpath_evaluate : function(specifier, context, resultType){
        var result = null;
        try {
            if ( typeof(GlobalNSResolver) != "undefined") 
                document = GlobalNSResolver.document;
            else
                document = qtpProps.wnd.document;
				
            if (document.evaluate)
            {
				result = document.evaluate(specifier, context, null, window.XPathResult[resultType], null);                
            }
            else
            {            
                if (! qtpProps.window.document.evaluate)
                {
                    if (typeof(GlobalNSResolver) != "undefined" && GlobalNSResolver.navigator)
                       navigator = GlobalNSResolver.navigator;
                    else if (document && document.parentWindow && document.parentWindow.navigator)
                       navigator = document.parentWindow.navigator;
					else if (qtpProps.wnd && qtpProps.wnd.navigator)
					   navigator = qtpProps.wnd.navigator;
                    
                    qtpProps.XPathInjector();

					// Inject into DOM's original window, this will enable UFT's web agent to use document.evaluate for free
					// on Browsers which don't have native XPath support, for example: Windows Phone.
					if (qtpProps.wnd){
						var localWindow = window;
						window = qtpProps.wnd;
						qtpProps.XPathInjector();
						window = localWindow;
					}

                    navigator = null; 
				}
			result =  qtpProps.window.document.evaluate(specifier,  context, null,qtpProps.window.XPathResult[resultType], null);	            
			}		   
        }
        finally {
            navigator = null;
            document = null;
        }
        return result;
    },	
    xpath: function(specifier, context) {
  
        var retVal = [], curVal;
            var result=finder.xpath_evaluate(specifier, context,"ANY_TYPE");    
		    while (curVal = result.iterateNext())			
		        retVal.push(curVal);
	    return retVal;
    },
    uniqify: function( arr1, arr2 )
    {
       var retVal = [];
       for (var objIndex1 in arr1)
       {
            var obj1 = arr1[objIndex1];
            if (obj1.wrappedJSObject) 
                obj1 = obj1.wrappedJSObject
            for (var objIndex2 in arr2)
            {
                var obj2 = arr2[objIndex2];
                if (obj2.wrappedJSObject)
                    obj2 = obj2.wrappedJSObject

                // Need to compare the wrappedJSObjects in FF7 otherwise 
                if (obj1==obj2)
                {
					// We push arr1[obj1] so we end up with the same object otherwise uniquify 
                    // will return a different object then we do without uniqify.
                    retVal.push(arr1[objIndex1]);
                    break;
                }
           }
       }      
     return retVal;
  }   
};

qtpProps.evaluate = function(){
    try {
        //set the document to be the current one
        if (  typeof(GlobalNSResolver) != "undefined")
            document = GlobalNSResolver.document;
        else
            document = qtpProps.wnd.document;

        var retVal = [];
        var firstTime = true;
        var context = null;
        for (var i = 0; i < arguments.length; i++)
        {
            var specifier = arguments[i];

            if (specifier == undefined)
                continue;

            if (typeof(specifier) == "object" ){
                context = specifier;
                continue;
            }
            var pos = specifier.indexOf(":");
            if (pos == -1)
                continue;

            var finderFunc = finder[specifier.substr(0, pos)];

            specifier = specifier.substr(pos +1);
            if (firstTime){        
                retVal = finderFunc(specifier,context);   
                firstTime = false;
            }
            else{        
                retVal = finder.uniqify(retVal,finderFunc(specifier,context));   
            }
        }
    } finally {
        document = null;
    }
    return retVal;
};

qtpProps.finder = finder;

this._QTP = this._QTP || {};
_QTP = this._QTP; 

if (Object.keys) { // Object.keys is not supported for old browsers like IE8 and below
    Object.keys(qtpProps).forEach(function (key) {
        this._QTP[key] = qtpProps[key];
    });
}
else {
    for (key in qtpProps) {
        this._QTP[key] = qtpProps[key];
    }
}

// Execute a dummy evaluate which will trigger injection of XPath support.
try{
	this._QTP.evaluate(this.window.document, "xpath://body");
}catch(e){}

})(); 
