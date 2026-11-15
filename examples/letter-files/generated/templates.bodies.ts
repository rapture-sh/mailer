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

  return "<!doctype html>\n<html>\n  <body style=\"margin: 0; background: #f6f7f9; font-family: Arial, sans-serif\">\n    <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n      <tr>\n        <td align=\"center\" style=\"padding: 32px 16px\">\n          <table role=\"presentation\" width=\"100%\" style=\"max-width: 560px; background: #fff; border-radius: 12px\">\n            <tr>\n              <td style=\"padding: 28px 32px 0\">\n                <h1 style=\"margin: 0; font-size: 22px; color: #121825\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"heading") || (depth0 != null ? lookupProperty(depth0,"heading") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"heading","hash":{},"data":data,"loc":{"start":{"line":14,"column":71},"end":{"line":14,"column":84}}}) : helper)))
    + "</h1>\n              </td>\n            </tr>\n"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"@partial-block"),depth0,{"name":"@partial-block","data":data,"indent":"            ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "          </table>\n        </td>\n      </tr>\n    </table>\n  </body>\n</html>\n";
},"usePartial":true,"useData":true}),
};

for (const [name, partial] of Object.entries(partials)) {
  runtime.registerPartial(name, partial);
}

export const bodies = {
  "magic-code": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <tr>\n    <td style=\"padding: 20px 32px 0; font-size: 15px\">Hi "
    + alias1(container.lambda(((stack1 = (depth0 != null ? lookupProperty(depth0,"reader") : depth0)) != null ? lookupProperty(stack1,"name") : stack1), depth0))
    + ",</td>\n  </tr>\n  <tr>\n    <td align=\"center\" style=\"padding: 20px 32px 28px\">\n      <div style=\"background: #e6eefb; border-radius: 12px; padding: 18px; font-size: 26px; letter-spacing: 6px; color: #2563c4\">\n        "
    + alias1(((helper = (helper = lookupProperty(helpers,"code") || (depth0 != null ? lookupProperty(depth0,"code") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"code","hash":{},"data":data,"loc":{"start":{"line":8,"column":8},"end":{"line":8,"column":18}}}) : helper)))
    + "\n      </div>\n    </td>\n  </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"layout"),depth0,{"name":"layout","hash":{"heading":"Sign in to Acme"},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
  "receipt": runtime.template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <tr>\n    <td style=\"padding: 20px 32px 0; font-size: 15px\">\n      "
    + alias4(((helper = (helper = lookupProperty(helpers,"activityName") || (depth0 != null ? lookupProperty(depth0,"activityName") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"activityName","hash":{},"data":data,"loc":{"start":{"line":8,"column":6},"end":{"line":8,"column":24}}}) : helper)))
    + " for "
    + alias4(((helper = (helper = lookupProperty(helpers,"participants") || (depth0 != null ? lookupProperty(depth0,"participants") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"participants","hash":{},"data":data,"loc":{"start":{"line":8,"column":29},"end":{"line":8,"column":47}}}) : helper)))
    + " people, "
    + alias4((lookupProperty(helpers,"dateTime")||(depth0 && lookupProperty(depth0,"dateTime"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"startsAt") : depth0),{"name":"dateTime","hash":{"zone":(depth0 != null ? lookupProperty(depth0,"timezone") : depth0)},"data":data,"loc":{"start":{"line":8,"column":56},"end":{"line":8,"column":93}}}))
    + ".\n    </td>\n  </tr>\n  <tr>\n    <td style=\"padding: 12px 32px 0; font-size: 15px\">"
    + alias4((lookupProperty(helpers,"list")||(depth0 && lookupProperty(depth0,"list"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"tickets") : depth0),{"name":"list","hash":{},"data":data,"loc":{"start":{"line":12,"column":54},"end":{"line":12,"column":72}}}))
    + "</td>\n  </tr>\n  <tr>\n    <td style=\"padding: 12px 32px 28px; font-size: 15px\">\n      You paid "
    + alias4((lookupProperty(helpers,"money")||(depth0 && lookupProperty(depth0,"money"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"totalMinor") : depth0),(depth0 != null ? lookupProperty(depth0,"currency") : depth0),{"name":"money","hash":{},"data":data,"loc":{"start":{"line":16,"column":15},"end":{"line":16,"column":46}}}))
    + ".\n      "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"voucherCode") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":17,"column":6},"end":{"line":17,"column":70}}})) != null ? stack1 : "")
    + "\n    </td>\n  </tr>\n";
},"1":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "Voucher "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"voucherCode") || (depth0 != null ? lookupProperty(depth0,"voucherCode") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"voucherCode","hash":{},"data":data,"loc":{"start":{"line":17,"column":33},"end":{"line":17,"column":50}}}) : helper)))
    + " was applied.";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"layout"),depth0,{"name":"layout","hash":{"heading":"Thanks for your booking"},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true}),
};
