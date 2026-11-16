// @ts-nocheck Handlebars' precompiler emits plain JavaScript, which has no
// annotations to satisfy strict mode. Generated alongside the typed registry beside
// it. Do not edit.

import runtime from "handlebars/runtime";
import { registerCopyHelpers } from "@rapture-sh/mailer/handlebars";
import deCH from "../fixtures/locales/de-CH.json";
import enGB from "../fixtures/locales/en-GB.json";
import pirateSpeak from "../fixtures/locales/pirate-Speak.json";

export const copy = {
  default: "en-GB",
  catalogs: {
    "de-CH": deCH,
    "en-GB": enGB,
    "pirate-Speak": pirateSpeak,
  },
  values: {
    "supportLink": "<a href=\"mailto:support@example.com\">support@example.com</a>"
  },
};

registerCopyHelpers(runtime, copy);

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

/** Every file a letter's header attached, base64 as the providers take it. */
export const files = {
  "receipt/logo.png": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
};

export const bodies = {
  "booking": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <p>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"booking.intro",{"name":"t","hash":{"participantCount":(depth0 != null ? lookupProperty(depth0,"participants") : depth0),"activityName":(depth0 != null ? lookupProperty(depth0,"activityName") : depth0)},"data":data,"loc":{"start":{"line":2,"column":5},"end":{"line":2,"column":84}}}))
    + "</p>\n  <p>"
    + alias3((lookupProperty(helpers,"date")||(depth0 && lookupProperty(depth0,"date"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"startsAt") : depth0),{"name":"date","hash":{"style":"long","zone":(depth0 != null ? lookupProperty(depth0,"timezone") : depth0)},"data":data,"loc":{"start":{"line":3,"column":5},"end":{"line":3,"column":51}}}))
    + "</p>\n  <p>"
    + alias3((lookupProperty(helpers,"list")||(depth0 && lookupProperty(depth0,"list"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"tickets") : depth0),{"name":"list","hash":{},"data":data,"loc":{"start":{"line":4,"column":5},"end":{"line":4,"column":23}}}))
    + "</p>\n  <p>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"booking.paid",{"name":"t","hash":{"totalAmount":(lookupProperty(helpers,"money")||(depth0 && lookupProperty(depth0,"money"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"totalMinor") : depth0),(depth0 != null ? lookupProperty(depth0,"currency") : depth0),{"name":"money","hash":{},"data":data,"loc":{"start":{"line":5,"column":37},"end":{"line":5,"column":64}}})},"data":data,"loc":{"start":{"line":5,"column":5},"end":{"line":5,"column":67}}}))
    + "</p>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"voucherCode") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":6,"column":2},"end":{"line":8,"column":9}}})) != null ? stack1 : "");
},"1":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <p>Voucher "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"voucherCode") || (depth0 != null ? lookupProperty(depth0,"voucherCode") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"voucherCode","hash":{},"data":data,"loc":{"start":{"line":7,"column":15},"end":{"line":7,"column":32}}}) : helper)))
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
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <p>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"greeting.named",{"name":"t","hash":{"displayName":((stack1 = (depth0 != null ? lookupProperty(depth0,"reader") : depth0)) != null ? lookupProperty(stack1,"name") : stack1)},"data":data,"loc":{"start":{"line":2,"column":5},"end":{"line":2,"column":53}}}))
    + "</p>\n  <p>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"magic-code.body",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":3,"column":5},"end":{"line":3,"column":30}}}))
    + "</p>\n  <p><b>"
    + alias3(((helper = (helper = lookupProperty(helpers,"code") || (depth0 != null ? lookupProperty(depth0,"code") : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"code","hash":{},"data":data,"loc":{"start":{"line":4,"column":8},"end":{"line":4,"column":18}}}) : helper)))
    + "</b></p>\n  <p>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"magic-code.closing",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":5,"column":5},"end":{"line":5,"column":33}}}))
    + "</p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"layout"),depth0,{"name":"layout","hash":{"heading":(lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"magic-code.heading",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":1,"column":20},"end":{"line":1,"column":44}}})},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
  "receipt": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <p>Receipt "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"reference") || (depth0 != null ? lookupProperty(depth0,"reference") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"reference","hash":{},"data":data,"loc":{"start":{"line":2,"column":13},"end":{"line":2,"column":28}}}) : helper)))
    + " is attached.</p>\n  <p><img src=\"cid:logo\" alt=\"Acme\"></p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"layout"),depth0,{"name":"layout","hash":{"heading":"Receipt"},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
  "reminder": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <p>"
    + container.escapeExpression((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||container.hooks.helperMissing).call(alias1,"greeting.named",{"name":"t","hash":{"displayName":((stack1 = (depth0 != null ? lookupProperty(depth0,"reader") : depth0)) != null ? lookupProperty(stack1,"name") : stack1)},"data":data,"loc":{"start":{"line":8,"column":5},"end":{"line":8,"column":53}}}))
    + "</p>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"activityName") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":9,"column":2},"end":{"line":11,"column":9}}})) != null ? stack1 : "");
},"1":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <p>"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"activityName") || (depth0 != null ? lookupProperty(depth0,"activityName") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"activityName","hash":{},"data":data,"loc":{"start":{"line":10,"column":7},"end":{"line":10,"column":25}}}) : helper)))
    + " starts soon.</p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"layout"),depth0,{"name":"layout","hash":{"heading":(lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"reminder.heading",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":7,"column":20},"end":{"line":7,"column":42}}})},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
  "welcome": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <p>"
    + container.escapeExpression((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"greeting.named",{"name":"t","hash":{"displayName":((stack1 = (depth0 != null ? lookupProperty(depth0,"reader") : depth0)) != null ? lookupProperty(stack1,"name") : stack1)},"data":data,"loc":{"start":{"line":2,"column":5},"end":{"line":2,"column":53}}}))
    + "</p>\n  <p>Welcome to Acme.</p>\n";
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
