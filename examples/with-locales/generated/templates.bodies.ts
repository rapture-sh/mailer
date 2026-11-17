// @ts-nocheck Handlebars' precompiler emits plain JavaScript, which has no
// annotations to satisfy strict mode. Generated alongside the typed registry beside
// it. Do not edit.

import runtime from "handlebars/runtime";
import { registerCopyHelpers } from "@rapturedotsh/mailer/handlebars";
import enGB from "../copy/english.json";
import deCH from "../copy/swiss-german.json";

export const copy = {
  default: "en-GB",
  catalogs: {
    "en-GB": enGB,
    "de-CH": deCH,
  },
  values: {
    "supportLink": "<a href=\"mailto:support@example.com\">support@example.com</a>",
    "siteLink": "<a href=\"https://example.com\">example.com</a>"
  },
};

registerCopyHelpers(runtime, copy);

const partials = {
  "layout": runtime.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<!doctype html>\n<html lang=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"locale") || (depth0 != null ? lookupProperty(depth0,"locale") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"locale","hash":{},"data":data,"loc":{"start":{"line":6,"column":12},"end":{"line":6,"column":24}}}) : helper)))
    + "\">\n  <body style=\"margin: 0; background: #f6f7f9; font-family: Arial, sans-serif\">\n    <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n      <tr>\n        <td align=\"center\" style=\"padding: 32px 16px\">\n          <table role=\"presentation\" width=\"100%\" style=\"max-width: 560px; background: #ffffff; border-radius: 12px\">\n            <tr>\n              <td style=\"padding: 28px 32px 0\">\n                <h1 style=\"margin: 0; font-size: 22px; color: #121825\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"heading") || (depth0 != null ? lookupProperty(depth0,"heading") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"heading","hash":{},"data":data,"loc":{"start":{"line":14,"column":71},"end":{"line":14,"column":84}}}) : helper)))
    + "</h1>\n              </td>\n            </tr>\n"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"@partial-block"),depth0,{"name":"@partial-block","data":data,"indent":"            ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "            <tr>\n              <td style=\"padding: 8px 32px 28px; font-size: 13px; color: #596579\">\n                "
    + alias4(((helper = (helper = lookupProperty(helpers,"closing") || (depth0 != null ? lookupProperty(depth0,"closing") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"closing","hash":{},"data":data,"loc":{"start":{"line":20,"column":16},"end":{"line":20,"column":29}}}) : helper)))
    + "\n              </td>\n            </tr>\n          </table>\n        </td>\n      </tr>\n    </table>\n  </body>\n</html>\n";
},"usePartial":true,"useData":true}),
};

for (const [name, partial] of Object.entries(partials)) {
  runtime.registerPartial(name, partial);
}

export const bodies = {
  "booking-confirmation": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <tr>\n    <td style=\"padding: 20px 32px 0; font-size: 15px; color: #121825\">\n      "
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"booking-confirmation.intro",{"name":"t","hash":{"participantCount":(depth0 != null ? lookupProperty(depth0,"participants") : depth0),"activityName":(depth0 != null ? lookupProperty(depth0,"activityName") : depth0)},"data":data,"loc":{"start":{"line":7,"column":6},"end":{"line":9,"column":41}}}))
    + "\n    </td>\n  </tr>\n  <tr>\n    <td style=\"padding: 16px 32px 0; font-size: 15px; color: #596579\">\n      "
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"booking-confirmation.when",{"name":"t","hash":{"when":(lookupProperty(helpers,"dateTime")||(depth0 && lookupProperty(depth0,"dateTime"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"startsAt") : depth0),{"name":"dateTime","hash":{"zone":(depth0 != null ? lookupProperty(depth0,"timezone") : depth0)},"data":data,"loc":{"start":{"line":14,"column":44},"end":{"line":14,"column":77}}})},"data":data,"loc":{"start":{"line":14,"column":6},"end":{"line":14,"column":80}}}))
    + "<br />\n      "
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"booking-confirmation.tickets",{"name":"t","hash":{"tickets":(lookupProperty(helpers,"list")||(depth0 && lookupProperty(depth0,"list"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"tickets") : depth0),{"name":"list","hash":{},"data":data,"loc":{"start":{"line":15,"column":50},"end":{"line":15,"column":64}}})},"data":data,"loc":{"start":{"line":15,"column":6},"end":{"line":15,"column":67}}}))
    + "<br />\n      "
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"booking-confirmation.paid",{"name":"t","hash":{"totalAmount":(lookupProperty(helpers,"money")||(depth0 && lookupProperty(depth0,"money"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"totalMinor") : depth0),(depth0 != null ? lookupProperty(depth0,"currency") : depth0),{"name":"money","hash":{},"data":data,"loc":{"start":{"line":16,"column":51},"end":{"line":16,"column":78}}})},"data":data,"loc":{"start":{"line":16,"column":6},"end":{"line":16,"column":81}}}))
    + "\n    </td>\n  </tr>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"voucherCode") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":19,"column":2},"end":{"line":25,"column":9}}})) != null ? stack1 : "");
},"1":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <tr>\n      <td style=\"padding: 16px 32px 0; font-size: 15px; color: #596579\">\n        "
    + container.escapeExpression((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"booking-confirmation.voucher",{"name":"t","hash":{"code":(depth0 != null ? lookupProperty(depth0,"voucherCode") : depth0)},"data":data,"loc":{"start":{"line":22,"column":8},"end":{"line":22,"column":63}}}))
    + "\n      </td>\n    </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"layout"),depth0,{"name":"layout","hash":{"closing":(lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"booking-confirmation.closing",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":3,"column":10},"end":{"line":3,"column":44}}}),"heading":(lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"booking-confirmation.heading",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":2,"column":10},"end":{"line":2,"column":44}}})},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
  "feedback": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <tr>\n    <td style=\"padding: 20px 32px 0; font-size: 15px; color: #121825\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"note") || (depth0 != null ? lookupProperty(depth0,"note") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"note","hash":{},"data":data,"loc":{"start":{"line":8,"column":70},"end":{"line":8,"column":80}}}) : helper)))
    + "</td>\n  </tr>\n  <tr>\n    <td style=\"padding: 12px 32px 0; font-size: 13px; color: #596579\">\n      "
    + alias4(((helper = (helper = lookupProperty(helpers,"from") || (depth0 != null ? lookupProperty(depth0,"from") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"from","hash":{},"data":data,"loc":{"start":{"line":12,"column":6},"end":{"line":12,"column":16}}}) : helper)))
    + " &middot; "
    + alias4(((helper = (helper = lookupProperty(helpers,"page") || (depth0 != null ? lookupProperty(depth0,"page") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"page","hash":{},"data":data,"loc":{"start":{"line":12,"column":26},"end":{"line":12,"column":36}}}) : helper)))
    + "\n    </td>\n  </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"layout"),depth0,{"name":"layout","hash":{"closing":"Sent from the feedback form.","heading":"New feedback"},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
  "magic-code": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <tr>\n    <td style=\"padding: 20px 32px 0; font-size: 15px; color: #121825\">\n      "
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"greeting.named",{"name":"t","hash":{"displayName":((stack1 = (depth0 != null ? lookupProperty(depth0,"reader") : depth0)) != null ? lookupProperty(stack1,"name") : stack1)},"data":data,"loc":{"start":{"line":7,"column":6},"end":{"line":7,"column":54}}}))
    + "\n    </td>\n  </tr>\n  <tr>\n    <td style=\"padding: 12px 32px 0; font-size: 15px; color: #596579\">\n      "
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"magic-code.body",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":12,"column":6},"end":{"line":12,"column":31}}}))
    + "\n    </td>\n  </tr>\n  <tr>\n    <td align=\"center\" style=\"padding: 20px 32px 4px\">\n      <div style=\"background: #e6eefb; border-radius: 12px; padding: 18px; font-size: 26px; letter-spacing: 6px; color: #2563c4\">\n        "
    + alias3(((helper = (helper = lookupProperty(helpers,"code") || (depth0 != null ? lookupProperty(depth0,"code") : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"code","hash":{},"data":data,"loc":{"start":{"line":18,"column":8},"end":{"line":18,"column":18}}}) : helper)))
    + "\n      </div>\n    </td>\n  </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"layout"),depth0,{"name":"layout","hash":{"closing":(lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"magic-code.closing",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":3,"column":10},"end":{"line":3,"column":34}}}),"heading":(lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"magic-code.heading",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":2,"column":10},"end":{"line":2,"column":34}}})},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
  "welcome": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <tr>\n    <td style=\"padding: 20px 32px 0; font-size: 15px; color: #121825\">\n      "
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"greeting.named",{"name":"t","hash":{"displayName":((stack1 = (depth0 != null ? lookupProperty(depth0,"reader") : depth0)) != null ? lookupProperty(stack1,"name") : stack1)},"data":data,"loc":{"start":{"line":7,"column":6},"end":{"line":7,"column":54}}}))
    + "\n    </td>\n  </tr>\n  <tr>\n    <td style=\"padding: 12px 32px 20px; font-size: 15px; color: #596579\">\n      "
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"welcome.body",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":12,"column":6},"end":{"line":12,"column":28}}}))
    + "\n    </td>\n  </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"layout"),depth0,{"name":"layout","hash":{"closing":(lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"welcome.closing",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":3,"column":10},"end":{"line":3,"column":31}}}),"heading":(lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"welcome.heading",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":2,"column":10},"end":{"line":2,"column":31}}})},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
};
