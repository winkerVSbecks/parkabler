"use strict";
var shared_1 = require('./shared');
var url_tree_1 = require('./url_tree');
var tree_1 = require('./utils/tree');
var UrlSerializer = (function () {
    function UrlSerializer() {
    }
    return UrlSerializer;
}());
exports.UrlSerializer = UrlSerializer;
var DefaultUrlSerializer = (function () {
    function DefaultUrlSerializer() {
    }
    DefaultUrlSerializer.prototype.parse = function (url) {
        var p = new UrlParser(url);
        return new url_tree_1.UrlTree(p.parseRootSegment(), p.parseQueryParams(), p.parseFragment());
    };
    DefaultUrlSerializer.prototype.serialize = function (tree) {
        var node = serializeUrlTreeNode(tree._root);
        var query = serializeQueryParams(tree.queryParams);
        var fragment = tree.fragment !== null ? "#" + tree.fragment : '';
        return "" + node + query + fragment;
    };
    return DefaultUrlSerializer;
}());
exports.DefaultUrlSerializer = DefaultUrlSerializer;
function serializeUrlTreeNode(node) {
    return "" + serializeSegment(node.value) + serializeChildren(node);
}
function serializeUrlTreeNodes(nodes) {
    var primary = serializeSegment(nodes[0].value);
    var secondaryNodes = nodes.slice(1);
    var secondary = secondaryNodes.length > 0 ? "(" + secondaryNodes.map(serializeUrlTreeNode).join("//") + ")" : '';
    var children = serializeChildren(nodes[0]);
    return "" + primary + secondary + children;
}
function serializeChildren(node) {
    if (node.children.length > 0) {
        return "/" + serializeUrlTreeNodes(node.children);
    }
    else {
        return '';
    }
}
function serializeSegment(segment) {
    var outlet = segment.outlet === shared_1.PRIMARY_OUTLET ? '' : segment.outlet + ":";
    return "" + outlet + segment.path + serializeParams(segment.parameters);
}
exports.serializeSegment = serializeSegment;
function serializeParams(params) {
    return pairs(params).map(function (p) { return (";" + p.first + "=" + p.second); }).join('');
}
function serializeQueryParams(params) {
    var strs = pairs(params).map(function (p) { return (p.first + "=" + p.second); });
    return strs.length > 0 ? "?" + strs.join("&") : '';
}
var Pair = (function () {
    function Pair(first, second) {
        this.first = first;
        this.second = second;
    }
    return Pair;
}());
function pairs(obj) {
    var res = [];
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            res.push(new Pair(prop, obj[prop]));
        }
    }
    return res;
}
var SEGMENT_RE = /^[^\/\(\)\?;=&#]+/;
function matchUrlSegment(str) {
    SEGMENT_RE.lastIndex = 0;
    var match = SEGMENT_RE.exec(str);
    return match ? match[0] : '';
}
var QUERY_PARAM_VALUE_RE = /^[^\(\)\?;&#]+/;
function matchUrlQueryParamValue(str) {
    QUERY_PARAM_VALUE_RE.lastIndex = 0;
    var match = QUERY_PARAM_VALUE_RE.exec(str);
    return match ? match[0] : '';
}
var UrlParser = (function () {
    function UrlParser(remaining) {
        this.remaining = remaining;
    }
    UrlParser.prototype.peekStartsWith = function (str) { return this.remaining.startsWith(str); };
    UrlParser.prototype.capture = function (str) {
        if (!this.remaining.startsWith(str)) {
            throw new Error("Expected \"" + str + "\".");
        }
        this.remaining = this.remaining.substring(str.length);
    };
    UrlParser.prototype.parseRootSegment = function () {
        if (this.remaining == '' || this.remaining == '/') {
            return new tree_1.TreeNode(new url_tree_1.UrlSegment('', {}, shared_1.PRIMARY_OUTLET), []);
        }
        else {
            var segments = this.parseSegments(false);
            return new tree_1.TreeNode(new url_tree_1.UrlSegment('', {}, shared_1.PRIMARY_OUTLET), segments);
        }
    };
    UrlParser.prototype.parseSegments = function (hasOutletName) {
        if (this.remaining.length == 0) {
            return [];
        }
        if (this.peekStartsWith('/')) {
            this.capture('/');
        }
        var path = matchUrlSegment(this.remaining);
        this.capture(path);
        var outletName;
        if (hasOutletName) {
            if (path.indexOf(':') === -1) {
                throw new Error('Not outlet name is provided');
            }
            if (path.indexOf(':') > -1 && hasOutletName) {
                var parts = path.split(':');
                outletName = parts[0];
                path = parts[1];
            }
        }
        else {
            if (path.indexOf(':') > -1) {
                throw new Error('Not outlet name is allowed');
            }
            outletName = shared_1.PRIMARY_OUTLET;
        }
        var matrixParams = {};
        if (this.peekStartsWith(';')) {
            matrixParams = this.parseMatrixParams();
        }
        var secondary = [];
        if (this.peekStartsWith('(')) {
            secondary = this.parseSecondarySegments();
        }
        var children = [];
        if (this.peekStartsWith('/') && !this.peekStartsWith('//')) {
            this.capture('/');
            children = this.parseSegments(false);
        }
        var segment = new url_tree_1.UrlSegment(path, matrixParams, outletName);
        var node = new tree_1.TreeNode(segment, children);
        return [node].concat(secondary);
    };
    UrlParser.prototype.parseQueryParams = function () {
        var params = {};
        if (this.peekStartsWith('?')) {
            this.capture('?');
            this.parseQueryParam(params);
            while (this.remaining.length > 0 && this.peekStartsWith('&')) {
                this.capture('&');
                this.parseQueryParam(params);
            }
        }
        return params;
    };
    UrlParser.prototype.parseFragment = function () {
        if (this.peekStartsWith('#')) {
            return this.remaining.substring(1);
        }
        else {
            return null;
        }
    };
    UrlParser.prototype.parseMatrixParams = function () {
        var params = {};
        while (this.remaining.length > 0 && this.peekStartsWith(';')) {
            this.capture(';');
            this.parseParam(params);
        }
        return params;
    };
    UrlParser.prototype.parseParam = function (params) {
        var key = matchUrlSegment(this.remaining);
        if (!key) {
            return;
        }
        this.capture(key);
        var value = 'true';
        if (this.peekStartsWith('=')) {
            this.capture('=');
            var valueMatch = matchUrlSegment(this.remaining);
            if (valueMatch) {
                value = valueMatch;
                this.capture(value);
            }
        }
        params[key] = value;
    };
    UrlParser.prototype.parseQueryParam = function (params) {
        var key = matchUrlSegment(this.remaining);
        if (!key) {
            return;
        }
        this.capture(key);
        var value = 'true';
        if (this.peekStartsWith('=')) {
            this.capture('=');
            var valueMatch = matchUrlQueryParamValue(this.remaining);
            if (valueMatch) {
                value = valueMatch;
                this.capture(value);
            }
        }
        params[key] = value;
    };
    UrlParser.prototype.parseSecondarySegments = function () {
        var segments = [];
        this.capture('(');
        while (!this.peekStartsWith(')') && this.remaining.length > 0) {
            segments = segments.concat(this.parseSegments(true));
            if (this.peekStartsWith('//')) {
                this.capture('//');
            }
        }
        this.capture(')');
        return segments;
    };
    return UrlParser;
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsX3NlcmlhbGl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXJsX3NlcmlhbGl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHVCQUE2QixVQUFVLENBQUMsQ0FBQTtBQUN4Qyx5QkFBa0MsWUFBWSxDQUFDLENBQUE7QUFDL0MscUJBQXVCLGNBQWMsQ0FBQyxDQUFBO0FBTXRDO0lBQUE7SUFVQSxDQUFDO0lBQUQsb0JBQUM7QUFBRCxDQUFDLEFBVkQsSUFVQztBQVZxQixxQkFBYSxnQkFVbEMsQ0FBQTtBQUtEO0lBQUE7SUFZQSxDQUFDO0lBWEMsb0NBQUssR0FBTCxVQUFNLEdBQVc7UUFDZixJQUFNLENBQUMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QixNQUFNLENBQUMsSUFBSSxrQkFBTyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFFRCx3Q0FBUyxHQUFULFVBQVUsSUFBYTtRQUNyQixJQUFNLElBQUksR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUMsSUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3JELElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxHQUFHLE1BQUksSUFBSSxDQUFDLFFBQVUsR0FBRyxFQUFFLENBQUM7UUFDbkUsTUFBTSxDQUFDLEtBQUcsSUFBSSxHQUFHLEtBQUssR0FBRyxRQUFVLENBQUM7SUFDdEMsQ0FBQztJQUNILDJCQUFDO0FBQUQsQ0FBQyxBQVpELElBWUM7QUFaWSw0QkFBb0IsdUJBWWhDLENBQUE7QUFFRCw4QkFBOEIsSUFBMEI7SUFDdEQsTUFBTSxDQUFDLEtBQUcsZ0JBQWdCLENBQUMsSUFB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Q0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckIsQ0FBQztRQUNILENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRWxCLE1BQU0sQ0FBQyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQUNILGdCQUFDO0FBQUQsQ0FBQyxBQXRKRCxJQXNKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UFJJTUFSWV9PVVRMRVR9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7VXJsU2VnbWVudCwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge1RyZWVOb2RlfSBmcm9tICcuL3V0aWxzL3RyZWUnO1xuXG5cbi8qKlxuICogRGVmaW5lcyBhIHdheSB0byBzZXJpYWxpemUvZGVzZXJpYWxpemUgYSB1cmwgdHJlZS5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFVybFNlcmlhbGl6ZXIge1xuICAvKipcbiAgICogUGFyc2UgYSB1cmwgaW50byBhIHtATGluayBVcmxUcmVlfVxuICAgKi9cbiAgYWJzdHJhY3QgcGFyc2UodXJsOiBzdHJpbmcpOiBVcmxUcmVlO1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIHtATGluayBVcmxUcmVlfSBpbnRvIGEgdXJsXG4gICAqL1xuICBhYnN0cmFjdCBzZXJpYWxpemUodHJlZTogVXJsVHJlZSk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIHNlcmlhbGl6YXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWZhdWx0VXJsU2VyaWFsaXplciBpbXBsZW1lbnRzIFVybFNlcmlhbGl6ZXIge1xuICBwYXJzZSh1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICAgIGNvbnN0IHAgPSBuZXcgVXJsUGFyc2VyKHVybCk7XG4gICAgcmV0dXJuIG5ldyBVcmxUcmVlKHAucGFyc2VSb290U2VnbWVudCgpLCBwLnBhcnNlUXVlcnlQYXJhbXMoKSwgcC5wYXJzZUZyYWdtZW50KCkpO1xuICB9XG5cbiAgc2VyaWFsaXplKHRyZWU6IFVybFRyZWUpOiBzdHJpbmcge1xuICAgIGNvbnN0IG5vZGUgPSBzZXJpYWxpemVVcmxUcmVlTm9kZSh0cmVlLl9yb290KTtcbiAgICBjb25zdCBxdWVyeSA9IHNlcmlhbGl6ZVF1ZXJ5UGFyYW1zKHRyZWUucXVlcnlQYXJhbXMpO1xuICAgIGNvbnN0IGZyYWdtZW50ID0gdHJlZS5mcmFnbWVudCAhPT0gbnVsbCA/IGAjJHt0cmVlLmZyYWdtZW50fWAgOiAnJztcbiAgICByZXR1cm4gYCR7bm9kZX0ke3F1ZXJ5fSR7ZnJhZ21lbnR9YDtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVVcmxUcmVlTm9kZShub2RlOiBUcmVlTm9kZTxVcmxTZWdtZW50Pik6IHN0cmluZyB7XG4gIHJldHVybiBgJHtzZXJpYWxpemVTZWdtZW50KG5vZGUudmFsdWUpfSR7c2VyaWFsaXplQ2hpbGRyZW4obm9kZSl9YDtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplVXJsVHJlZU5vZGVzKG5vZGVzOiBUcmVlTm9kZTxVcmxTZWdtZW50PltdKTogc3RyaW5nIHtcbiAgY29uc3QgcHJpbWFyeSA9IHNlcmlhbGl6ZVNlZ21lbnQobm9kZXNbMF0udmFsdWUpO1xuICBjb25zdCBzZWNvbmRhcnlOb2RlcyA9IG5vZGVzLnNsaWNlKDEpO1xuICBjb25zdCBzZWNvbmRhcnkgPVxuICAgICAgc2Vjb25kYXJ5Tm9kZXMubGVuZ3RoID4gMCA/IGAoJHtzZWNvbmRhcnlOb2Rlcy5tYXAoc2VyaWFsaXplVXJsVHJlZU5vZGUpLmpvaW4oXCIvL1wiKX0pYCA6ICcnO1xuICBjb25zdCBjaGlsZHJlbiA9IHNlcmlhbGl6ZUNoaWxkcmVuKG5vZGVzWzBdKTtcbiAgcmV0dXJuIGAke3ByaW1hcnl9JHtzZWNvbmRhcnl9JHtjaGlsZHJlbn1gO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVDaGlsZHJlbihub2RlOiBUcmVlTm9kZTxVcmxTZWdtZW50Pik6IHN0cmluZyB7XG4gIGlmIChub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gYC8ke3NlcmlhbGl6ZVVybFRyZWVOb2Rlcyhub2RlLmNoaWxkcmVuKX1gO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnJztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplU2VnbWVudChzZWdtZW50OiBVcmxTZWdtZW50KTogc3RyaW5nIHtcbiAgY29uc3Qgb3V0bGV0ID0gc2VnbWVudC5vdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUID8gJycgOiBgJHtzZWdtZW50Lm91dGxldH06YDtcbiAgcmV0dXJuIGAke291dGxldH0ke3NlZ21lbnQucGF0aH0ke3NlcmlhbGl6ZVBhcmFtcyhzZWdtZW50LnBhcmFtZXRlcnMpfWA7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZVBhcmFtcyhwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhaXJzKHBhcmFtcykubWFwKHAgPT4gYDske3AuZmlyc3R9PSR7cC5zZWNvbmR9YCkuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZVF1ZXJ5UGFyYW1zKHBhcmFtczoge1trZXk6IHN0cmluZ106IHN0cmluZ30pOiBzdHJpbmcge1xuICBjb25zdCBzdHJzID0gcGFpcnMocGFyYW1zKS5tYXAocCA9PiBgJHtwLmZpcnN0fT0ke3Auc2Vjb25kfWApO1xuICByZXR1cm4gc3Rycy5sZW5ndGggPiAwID8gYD8ke3N0cnMuam9pbihcIiZcIil9YCA6ICcnO1xufVxuXG5jbGFzcyBQYWlyPEEsIEI+IHtcbiAgY29uc3RydWN0b3IocHVibGljIGZpcnN0OiBBLCBwdWJsaWMgc2Vjb25kOiBCKSB7fVxufVxuZnVuY3Rpb24gcGFpcnM8VD4ob2JqOiB7W2tleTogc3RyaW5nXTogVH0pOiBQYWlyPHN0cmluZywgVD5bXSB7XG4gIGNvbnN0IHJlcyA9IFtdO1xuICBmb3IgKGxldCBwcm9wIGluIG9iaikge1xuICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgIHJlcy5wdXNoKG5ldyBQYWlyPHN0cmluZywgVD4ocHJvcCwgb2JqW3Byb3BdKSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXM7XG59XG5cbmNvbnN0IFNFR01FTlRfUkUgPSAvXlteXFwvXFwoXFwpXFw/Oz0mI10rLztcbmZ1bmN0aW9uIG1hdGNoVXJsU2VnbWVudChzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIFNFR01FTlRfUkUubGFzdEluZGV4ID0gMDtcbiAgdmFyIG1hdGNoID0gU0VHTUVOVF9SRS5leGVjKHN0cik7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzBdIDogJyc7XG59XG5cbmNvbnN0IFFVRVJZX1BBUkFNX1ZBTFVFX1JFID0gL15bXlxcKFxcKVxcPzsmI10rLztcbmZ1bmN0aW9uIG1hdGNoVXJsUXVlcnlQYXJhbVZhbHVlKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgUVVFUllfUEFSQU1fVkFMVUVfUkUubGFzdEluZGV4ID0gMDtcbiAgY29uc3QgbWF0Y2ggPSBRVUVSWV9QQVJBTV9WQUxVRV9SRS5leGVjKHN0cik7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzBdIDogJyc7XG59XG5cbmNsYXNzIFVybFBhcnNlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVtYWluaW5nOiBzdHJpbmcpIHt9XG5cbiAgcGVla1N0YXJ0c1dpdGgoc3RyOiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMucmVtYWluaW5nLnN0YXJ0c1dpdGgoc3RyKTsgfVxuXG4gIGNhcHR1cmUoc3RyOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucmVtYWluaW5nLnN0YXJ0c1dpdGgoc3RyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBcIiR7c3RyfVwiLmApO1xuICAgIH1cbiAgICB0aGlzLnJlbWFpbmluZyA9IHRoaXMucmVtYWluaW5nLnN1YnN0cmluZyhzdHIubGVuZ3RoKTtcbiAgfVxuXG4gIHBhcnNlUm9vdFNlZ21lbnQoKTogVHJlZU5vZGU8VXJsU2VnbWVudD4ge1xuICAgIGlmICh0aGlzLnJlbWFpbmluZyA9PSAnJyB8fCB0aGlzLnJlbWFpbmluZyA9PSAnLycpIHtcbiAgICAgIHJldHVybiBuZXcgVHJlZU5vZGU8VXJsU2VnbWVudD4obmV3IFVybFNlZ21lbnQoJycsIHt9LCBQUklNQVJZX09VVExFVCksIFtdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc2VnbWVudHMgPSB0aGlzLnBhcnNlU2VnbWVudHMoZmFsc2UpO1xuICAgICAgcmV0dXJuIG5ldyBUcmVlTm9kZTxVcmxTZWdtZW50PihuZXcgVXJsU2VnbWVudCgnJywge30sIFBSSU1BUllfT1VUTEVUKSwgc2VnbWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlU2VnbWVudHMoaGFzT3V0bGV0TmFtZTogYm9vbGVhbik6IFRyZWVOb2RlPFVybFNlZ21lbnQ+W10ge1xuICAgIGlmICh0aGlzLnJlbWFpbmluZy5sZW5ndGggPT0gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBpZiAodGhpcy5wZWVrU3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICB0aGlzLmNhcHR1cmUoJy8nKTtcbiAgICB9XG4gICAgbGV0IHBhdGggPSBtYXRjaFVybFNlZ21lbnQodGhpcy5yZW1haW5pbmcpO1xuICAgIHRoaXMuY2FwdHVyZShwYXRoKTtcblxuICAgIGxldCBvdXRsZXROYW1lO1xuICAgIGlmIChoYXNPdXRsZXROYW1lKSB7XG4gICAgICBpZiAocGF0aC5pbmRleE9mKCc6JykgPT09IC0xKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IG91dGxldCBuYW1lIGlzIHByb3ZpZGVkJyk7XG4gICAgICB9XG4gICAgICBpZiAocGF0aC5pbmRleE9mKCc6JykgPiAtMSAmJiBoYXNPdXRsZXROYW1lKSB7XG4gICAgICAgIGxldCBwYXJ0cyA9IHBhdGguc3BsaXQoJzonKTtcbiAgICAgICAgb3V0bGV0TmFtZSA9IHBhcnRzWzBdO1xuICAgICAgICBwYXRoID0gcGFydHNbMV07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChwYXRoLmluZGV4T2YoJzonKSA+IC0xKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IG91dGxldCBuYW1lIGlzIGFsbG93ZWQnKTtcbiAgICAgIH1cbiAgICAgIG91dGxldE5hbWUgPSBQUklNQVJZX09VVExFVDtcbiAgICB9XG5cbiAgICBsZXQgbWF0cml4UGFyYW1zOiB7W2tleTogc3RyaW5nXTogYW55fSA9IHt9O1xuICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCc7JykpIHtcbiAgICAgIG1hdHJpeFBhcmFtcyA9IHRoaXMucGFyc2VNYXRyaXhQYXJhbXMoKTtcbiAgICB9XG5cbiAgICBsZXQgc2Vjb25kYXJ5ID0gW107XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJygnKSkge1xuICAgICAgc2Vjb25kYXJ5ID0gdGhpcy5wYXJzZVNlY29uZGFyeVNlZ21lbnRzKCk7XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkcmVuOiBUcmVlTm9kZTxVcmxTZWdtZW50PltdID0gW107XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8nKSAmJiAhdGhpcy5wZWVrU3RhcnRzV2l0aCgnLy8nKSkge1xuICAgICAgdGhpcy5jYXB0dXJlKCcvJyk7XG4gICAgICBjaGlsZHJlbiA9IHRoaXMucGFyc2VTZWdtZW50cyhmYWxzZSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VnbWVudCA9IG5ldyBVcmxTZWdtZW50KHBhdGgsIG1hdHJpeFBhcmFtcywgb3V0bGV0TmFtZSk7XG4gICAgY29uc3Qgbm9kZSA9IG5ldyBUcmVlTm9kZTxVcmxTZWdtZW50PihzZWdtZW50LCBjaGlsZHJlbik7XG4gICAgcmV0dXJuIFtub2RlXS5jb25jYXQoc2Vjb25kYXJ5KTtcbiAgfVxuXG4gIHBhcnNlUXVlcnlQYXJhbXMoKToge1trZXk6IHN0cmluZ106IGFueX0ge1xuICAgIHZhciBwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9ID0ge307XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJz8nKSkge1xuICAgICAgdGhpcy5jYXB0dXJlKCc/Jyk7XG4gICAgICB0aGlzLnBhcnNlUXVlcnlQYXJhbShwYXJhbXMpO1xuICAgICAgd2hpbGUgKHRoaXMucmVtYWluaW5nLmxlbmd0aCA+IDAgJiYgdGhpcy5wZWVrU3RhcnRzV2l0aCgnJicpKSB7XG4gICAgICAgIHRoaXMuY2FwdHVyZSgnJicpO1xuICAgICAgICB0aGlzLnBhcnNlUXVlcnlQYXJhbShwYXJhbXMpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zO1xuICB9XG5cbiAgcGFyc2VGcmFnbWVudCgpOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJyMnKSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVtYWluaW5nLnN1YnN0cmluZygxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcGFyc2VNYXRyaXhQYXJhbXMoKToge1trZXk6IHN0cmluZ106IGFueX0ge1xuICAgIHZhciBwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9ID0ge307XG4gICAgd2hpbGUgKHRoaXMucmVtYWluaW5nLmxlbmd0aCA+IDAgJiYgdGhpcy5wZWVrU3RhcnRzV2l0aCgnOycpKSB7XG4gICAgICB0aGlzLmNhcHR1cmUoJzsnKTtcbiAgICAgIHRoaXMucGFyc2VQYXJhbShwYXJhbXMpO1xuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zO1xuICB9XG5cbiAgcGFyc2VQYXJhbShwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9KTogdm9pZCB7XG4gICAgdmFyIGtleSA9IG1hdGNoVXJsU2VnbWVudCh0aGlzLnJlbWFpbmluZyk7XG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jYXB0dXJlKGtleSk7XG4gICAgdmFyIHZhbHVlOiBhbnkgPSAndHJ1ZSc7XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJz0nKSkge1xuICAgICAgdGhpcy5jYXB0dXJlKCc9Jyk7XG4gICAgICB2YXIgdmFsdWVNYXRjaCA9IG1hdGNoVXJsU2VnbWVudCh0aGlzLnJlbWFpbmluZyk7XG4gICAgICBpZiAodmFsdWVNYXRjaCkge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlTWF0Y2g7XG4gICAgICAgIHRoaXMuY2FwdHVyZSh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgfVxuXG4gIHBhcnNlUXVlcnlQYXJhbShwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9KTogdm9pZCB7XG4gICAgdmFyIGtleSA9IG1hdGNoVXJsU2VnbWVudCh0aGlzLnJlbWFpbmluZyk7XG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jYXB0dXJlKGtleSk7XG4gICAgdmFyIHZhbHVlOiBhbnkgPSAndHJ1ZSc7XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJz0nKSkge1xuICAgICAgdGhpcy5jYXB0dXJlKCc9Jyk7XG4gICAgICB2YXIgdmFsdWVNYXRjaCA9IG1hdGNoVXJsUXVlcnlQYXJhbVZhbHVlKHRoaXMucmVtYWluaW5nKTtcbiAgICAgIGlmICh2YWx1ZU1hdGNoKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWVNYXRjaDtcbiAgICAgICAgdGhpcy5jYXB0dXJlKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgfVxuXG4gIHBhcnNlU2Vjb25kYXJ5U2VnbWVudHMoKTogVHJlZU5vZGU8VXJsU2VnbWVudD5bXSB7XG4gICAgdmFyIHNlZ21lbnRzID0gW107XG4gICAgdGhpcy5jYXB0dXJlKCcoJyk7XG5cbiAgICB3aGlsZSAoIXRoaXMucGVla1N0YXJ0c1dpdGgoJyknKSAmJiB0aGlzLnJlbWFpbmluZy5sZW5ndGggPiAwKSB7XG4gICAgICBzZWdtZW50cyA9IHNlZ21lbnRzLmNvbmNhdCh0aGlzLnBhcnNlU2VnbWVudHModHJ1ZSkpO1xuICAgICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8vJykpIHtcbiAgICAgICAgdGhpcy5jYXB0dXJlKCcvLycpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmNhcHR1cmUoJyknKTtcblxuICAgIHJldHVybiBzZWdtZW50cztcbiAgfVxufVxuIl19