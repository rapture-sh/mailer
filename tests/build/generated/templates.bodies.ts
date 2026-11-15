// @ts-nocheck Handlebars' precompiler emits plain JavaScript, which has no
// annotations to satisfy strict mode. Generated alongside the typed registry beside
// it. Do not edit.

import runtime from "handlebars/runtime";

const partials = {
  "layout": runtime.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<html>\n  <body>\n    <h1>"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"heading") || (depth0 != null ? lookupProperty(depth0,"heading") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"heading","hash":{},"data":data,"loc":{"start":{"line":4,"column":8},"end":{"line":4,"column":21}}}) : helper)))
    + "</h1>\n"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"@partial-block"),depth0,{"name":"@partial-block","data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "  </body>\n</html>\n";
},"usePartial":true,"useData":true}),
};

for (const [name, partial] of Object.entries(partials)) {
  runtime.registerPartial(name, partial);
}

export const bodies = {
  "booking": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <p>"
    + alias4(((helper = (helper = lookupProperty(helpers,"activityName") || (depth0 != null ? lookupProperty(depth0,"activityName") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"activityName","hash":{},"data":data,"loc":{"start":{"line":2,"column":5},"end":{"line":2,"column":23}}}) : helper)))
    + ", "
    + alias4(((helper = (helper = lookupProperty(helpers,"participants") || (depth0 != null ? lookupProperty(depth0,"participants") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"participants","hash":{},"data":data,"loc":{"start":{"line":2,"column":25},"end":{"line":2,"column":43}}}) : helper)))
    + " people, reference "
    + alias4(((helper = (helper = lookupProperty(helpers,"reference") || (depth0 != null ? lookupProperty(depth0,"reference") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"reference","hash":{},"data":data,"loc":{"start":{"line":2,"column":62},"end":{"line":2,"column":77}}}) : helper)))
    + ".</p>\n  <ul>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"tickets") : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":4},"end":{"line":6,"column":13}}})) != null ? stack1 : "")
    + "  </ul>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"voucherCode") : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":8,"column":2},"end":{"line":10,"column":9}}})) != null ? stack1 : "");
},"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      <li>"
    + alias4(((helper = (helper = lookupProperty(helpers,"quantity") || (depth0 != null ? lookupProperty(depth0,"quantity") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"quantity","hash":{},"data":data,"loc":{"start":{"line":5,"column":10},"end":{"line":5,"column":24}}}) : helper)))
    + " "
    + alias4(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":5,"column":25},"end":{"line":5,"column":35}}}) : helper)))
    + "</li>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <p>Voucher "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"voucherCode") || (depth0 != null ? lookupProperty(depth0,"voucherCode") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"voucherCode","hash":{},"data":data,"loc":{"start":{"line":9,"column":15},"end":{"line":9,"column":32}}}) : helper)))
    + " applied.</p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"layout"),depth0,{"name":"layout","hash":{"heading":"Booking confirmed"},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
  "feedback": runtime.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<p>"
    + alias4(((helper = (helper = lookupProperty(helpers,"note") || (depth0 != null ? lookupProperty(depth0,"note") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"note","hash":{},"data":data,"loc":{"start":{"line":1,"column":3},"end":{"line":1,"column":13}}}) : helper)))
    + "</p>\n<p>From "
    + alias4(((helper = (helper = lookupProperty(helpers,"from") || (depth0 != null ? lookupProperty(depth0,"from") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"from","hash":{},"data":data,"loc":{"start":{"line":2,"column":8},"end":{"line":2,"column":18}}}) : helper)))
    + "</p>\n";
},"useData":true}),
  "magic-code": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <p>Hi "
    + alias1(container.lambda(((stack1 = (depth0 != null ? lookupProperty(depth0,"reader") : depth0)) != null ? lookupProperty(stack1,"name") : stack1), depth0))
    + ",</p>\n  <p>Your code is <b>"
    + alias1(((helper = (helper = lookupProperty(helpers,"code") || (depth0 != null ? lookupProperty(depth0,"code") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"code","hash":{},"data":data,"loc":{"start":{"line":3,"column":21},"end":{"line":3,"column":31}}}) : helper)))
    + "</b>.</p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"layout"),depth0,{"name":"layout","hash":{"heading":"Sign in"},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
  "welcome": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <p>Hi "
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? lookupProperty(depth0,"reader") : depth0)) != null ? lookupProperty(stack1,"name") : stack1), depth0))
    + ", welcome to Acme.</p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"layout"),depth0,{"name":"layout","hash":{"heading":"Welcome"},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
};
