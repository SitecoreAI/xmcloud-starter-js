import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';
import { renderSDK, freeze } from '../components/allianz-rich-text/__tests__/optional-icons-fixture.mjs';

const React = require('react'), sdk = require('@sitecore-content-sdk/nextjs'), ts = require('typescript');
const fixture = JSON.parse(fs.readFileSync(new URL('./allianz-retained-native-body-assets.fixture.json', import.meta.url), 'utf8'));
const policy = loadSource(path.join(sourceRoot, 'lib/allianz-native-body-links.ts'));
const { safeLink } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { restoreSourceDestinationRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-source-destinations.ts'));
const modes = ['normal', 'preview', 'editing'];
process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';

function observedComponent(relative, observations) {
  const filename = path.join(sourceRoot, relative), compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk, RichText: (props) => {
      observations.push(props); return React.createElement(sdk.RichText, props);
    } };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) return /\.tsx?$/.test(resolved) ? loadSource(resolved) : require(resolved);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  return compiled.exports;
}
const cardCalls = [], accordionCalls = [];
const Cards = observedComponent('components/allianz-card-grid/AllianzCardGrid.tsx', cardCalls);
const Accordion = observedComponent('components/allianz-accordion/AllianzAccordion.tsx', accordionCalls);
const params = { layout: 'stacked', columns: '3', headingLevel: 'h3', RenderingIdentifier: 'GeneralLifeInsuranceQuestions' };
const meta = { itemId: 'test-only-native-body-observer', fieldId: 'test-only-native-body', fieldType: 'Rich Text' };
const syntheticField = (value) => ({ value, metadata: meta });
const context = (owner) => ({ componentName: owner.componentName, datasourceId: owner.datasourceId, entryId: owner.entryId });
const first = fixture.assetOwners[0], firstHref = first.hrefs[0];
const accordionOwner = fixture.assetOwners.find((owner) => owner.componentName === 'AllianzAccordion');
const accountHrefs = new Set(['/secured/accounts/personal-accounts/view-online-documents', '/New-York/Registration/individual', '/New-York/Login']);
const inertAccounts = (value) => value.replace(/href="([^"]*)"/g, (attribute, href) => accountHrefs.has(href) ? 'href="#service-unavailable"' : attribute);
const inertAllPartners = (value) => value.replace(/href="https:[^"]*"/g, 'href="#service-unavailable"').replaceAll('target="_blank"', 'target=""');

// Exact retained native Body/owner inputs, not fresh CMS or delivery evidence.
// Card inventory sha5557608c; NY five-group sha b07f0fd7; whole mount audit41402739.
// Surrounding Card fields are minimal test scaffolding; SDK observer metadata below is synthetic.
const capturedCards = [
  {
    "rootId": "77380671376541979D5F087A3DEC0486",
    "entryId": "9B66EB7015104E4E8C4D1C7F62D64332",
    "field": {
      "value": "<p>The majority (66%) of participants interested in an in-plan annuity prefer a solution that combines guaranteed lifetime income, protection from market loss, and growth potential (up to a limit) to help address rising costs.<sup>1 </sup></p> <p>As a fixed index annuity (FIA), that’s exactly what Allianz Lifetime Income+® is designed to offer:</p> <ul> <li><strong>Guaranteed lifetime income</strong> that lasts throughout retirement</li> <li><strong>Protection from market losses</strong><sup>2</sup></li> <li><strong>Growth potential</strong> through index-linked interest </li> </ul> <p>Unlike direct investments in stocks, bonds, or equities, participants are not exposed to market risk. Instead, interest is credited based on the performance of an external market index, such as the S&amp;P 500® Index, up to a cap or other limit. </p> <h3>Dive into the product details</h3><p><a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/06f4a478677049b99aaad62f7e5c5a72?v=9e703ece\" target=\"_blank\" aria-label=\"View product profile (PDF)\">View product profile (PDF)</a></p><p><a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/713f9c754cf447ca82fe9d659fdc76da?v=f9b3c003\" target=\"_blank\" aria-label=\"See allocation guide (PDF)\">See allocation guide (PDF)</a></p><p><a href=\"/what-we-offer/annuities/fixed-index-annuities/lifetime-income-plus/insights-and-education/resources#product\" aria-label=\"View all product resources\">View all product resources</a></p>"
    },
    "tags": [
      "<a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/06f4a478677049b99aaad62f7e5c5a72?v=9e703ece\" target=\"_blank\" aria-label=\"View product profile (PDF)\">",
      "<a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/713f9c754cf447ca82fe9d659fdc76da?v=f9b3c003\" target=\"_blank\" aria-label=\"See allocation guide (PDF)\">"
    ]
  },
  {
    "rootId": "D23735131F7E48A0BC3F18201E27D229",
    "entryId": "0BB473ED33E548ED9DEF4E748C7A92C9",
    "field": {
      "value": "<p>The sooner your client completes the PHI, the faster we can start underwriting the policy. Share the \"<a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/dd4b7da2e79b4f00baf855edf62b6d3e?v=26327524\">Underwriting made easy (PDF)</a>\" flier with your client to prep them for the ePHI and underwriting process. Or, if they elect to use the phone PHI, have them call to schedule an appointment.</p>"
    },
    "tags": [
      "<a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/dd4b7da2e79b4f00baf855edf62b6d3e?v=26327524\">"
    ]
  },
  {
    "rootId": "68F5EEA4E83F46E2AADFB4D244AA8230",
    "entryId": "B66D295E016549989C7537B75D8DFD91",
    "field": {
      "value": "<p>Explore our index allocation options and get help determining which may be most appropriate for the individual goals of your clients and prospects.</p> <p> <a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/c6a3d572182b4d01a53a8dc963f4dff3?v=9a543ba8\" target=\"_blank\"> Blended Futures Index: a closer look (PDF) </a> </p> <p> <a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/6142c2c4eb554829b54e700b8bac05fc?v=88bd4027\" target=\"_blank\"> Bloomberg US Dynamic Balance III ER Index: a closer look (PDF) </a> </p> <p> <a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/e4d3595c1b9e463dbee07f7e328ee5f7?v=22410764\" target=\"_blank\"> S&amp;P 500 Futures Index ER: a closer look (PDF) </a> </p> <p> <a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/46c921870c204fedbd006c33f432c5b2?v=a2ffc883\" target=\"_blank\"> PIMCO Tactical Balanced ER Index: a closer look (PDF) </a> </p> <p> <a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/e74df7f05c424ef883b33602b843046f?v=579fa2a3\" target=\"_blank\"> Index allocation guide (PDF) </a> </p> <p> <a href=\"https://www.allianzlife.com/-/media/Files/Global/documents/2017/01/03/09/08/M-5640.pdf\" target=\"_blank\"> Indexes used to determine interest potential (PDF) </a> </p>"
    },
    "tags": [
      "<a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/c6a3d572182b4d01a53a8dc963f4dff3?v=9a543ba8\" target=\"_blank\">",
      "<a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/6142c2c4eb554829b54e700b8bac05fc?v=88bd4027\" target=\"_blank\">",
      "<a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/e4d3595c1b9e463dbee07f7e328ee5f7?v=22410764\" target=\"_blank\">",
      "<a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/46c921870c204fedbd006c33f432c5b2?v=a2ffc883\" target=\"_blank\">",
      "<a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/e74df7f05c424ef883b33602b843046f?v=579fa2a3\" target=\"_blank\">"
    ]
  },
  {
    "rootId": "68F5EEA4E83F46E2AADFB4D244AA8230",
    "entryId": "C4F12D3C2DB14CC98DBC1B6683ECF133",
    "field": {
      "value": "<p>Learn more about the accumulation power of Index Lock – and how our Auto Lock feature makes it easier for your clients to lock in a desired index value automatically.</p> <p> <a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/c5915b8b27ac45889d5d48f0327dad1c?v=cbf17b6c\" target=\"_blank\"> Auto Lock case study (PDF) </a> </p> <p> <a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/8e13f769a8cd447e9cabc7beaf212cde?v=7fafc1d1\" target=\"_blank\"> Lock in increases. Lock out volatility (PDF) </a> </p> <p> <a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/f47d2f809a7d4bbc914afcc088010bd0?v=9f2d51d8\" target=\"_blank\"> Using Index Lock to capture interest (PDF) </a> </p> <p> <a href=\"/what-we-offer/Index-Lock\"> Additional Index Lock and Auto Lock resources </a> </p>"
    },
    "tags": [
      "<a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/c5915b8b27ac45889d5d48f0327dad1c?v=cbf17b6c\" target=\"_blank\">",
      "<a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/8e13f769a8cd447e9cabc7beaf212cde?v=7fafc1d1\" target=\"_blank\">",
      "<a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/f47d2f809a7d4bbc914afcc088010bd0?v=9f2d51d8\" target=\"_blank\">"
    ]
  }
];
const capturedNY = [
  {
    "placementIndex": 3,
    "uid": "4bdf45c5-c611-4f09-a54b-cca8256876c4",
    "componentName": "AllianzAccordion",
    "dataSource": "/sitecore/content/allianz/allianz-life/Home/new-york/tax-statement-frequently-asked-questions/Data/Tax FAQ group 01",
    "isContentResolved": true,
    "params": {
      "RenderingIdentifier": "general-tax-correspondence",
      "DynamicPlaceholderId": "4",
      "FieldNames": "Default"
    },
    "fields": {
      "data": {
        "datasource": {
          "id": "53B2A90AA4B1426B976A9AB45BCA6F71",
          "heading": {
            "jsonValue": {
              "value": "General Tax Correspondence"
            }
          },
          "primaryLink": {
            "jsonValue": {
              "value": {
                "href": ""
              }
            }
          },
          "children": {
            "total": 3,
            "pageInfo": {
              "hasNext": false,
              "endCursor": "Mw=="
            },
            "results": [
              {
                "id": "DAD9F80A6A5F4557A26C36E9CE8BEA60",
                "heading": {
                  "jsonValue": {
                    "value": "When can I expect to receive my 2025 tax forms?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p> We will mail IRS Forms 1099-R and substitute 5498 by January 31, 2026. Please allow 5-7 business days to receive your tax forms(s) by mail. After January 31, you can check to see if your tax forms are also available online by registering or logging in to your account and going to “<a href=\"/secured/accounts/personal-accounts/view-online-documents\">Current Statements</a>.” Please note that online tax forms under “Current Statements” are not available for certain types of contract owners. Allianz Life of NY does not issue any tax reporting for custodial IRAs or contracts owned by qualified retirement plans such as pension plans, Keogh plans, 401(k) plans, or defined benefit plans. </p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "9A0978A1E81B48DDA898DBC5EB257B92",
                "heading": {
                  "jsonValue": {
                    "value": "Where do I find my IRS Form 1099-R?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p> We will mail Form 1099-R by January 31, 2026. After January 31, you can check to see if your Form 1099-R is also available online by <a href=\"/New-York/Registration/individual\">registering</a> or <a href=\"/New-York/Login\">logging in</a> to your account and going to “<a href=\"/secured/accounts/personal-accounts/view-online-documents\">Current Statements</a>.” Please note that online tax forms under “Current Statements” are not available for certain types of contract owners.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "656422419B2D4FC89866613B6B3C6D34",
                "heading": {
                  "jsonValue": {
                    "value": "Where do I find my IRS Form 5498?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p> We will mail Form 5498 by January 31, 2026. After January 31, you can check to see if your Form 5498 is also available online by <a href=\"/New-York/Registration/individual\">registering</a> or <a href=\"/New-York/Login\">logging in</a> to your account and going to “<a href=\"/secured/accounts/personal-accounts/view-online-documents\">Current Statements</a>.” Please note that online tax forms under “Current Statements” are not available for certain types of contract owners.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              }
            ]
          }
        }
      }
    }
  },
  {
    "placementIndex": 5,
    "uid": "cad29d7a-e52c-4603-83be-6a2679687886",
    "componentName": "AllianzAccordion",
    "dataSource": "/sitecore/content/allianz/allianz-life/Home/new-york/tax-statement-frequently-asked-questions/Data/Tax FAQ group 02",
    "isContentResolved": true,
    "params": {
      "RenderingIdentifier": "form1099r",
      "DynamicPlaceholderId": "6",
      "FieldNames": "Default"
    },
    "fields": {
      "data": {
        "datasource": {
          "id": "87C7F67E4DFE4FC9A198DEB859C570C6",
          "heading": {
            "jsonValue": {
              "value": "IRS Form 1099-R"
            }
          },
          "primaryLink": {
            "jsonValue": {
              "value": {
                "href": ""
              }
            }
          },
          "children": {
            "total": 9,
            "pageInfo": {
              "hasNext": false,
              "endCursor": "OQ=="
            },
            "results": [
              {
                "id": "5F0E16F1D8DF4C3A8C0EE5ED40C27E05",
                "heading": {
                  "jsonValue": {
                    "value": "Why did I receive an IRS Form 1099-R from Allianz Life of NY?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p> A Form 1099-R is used to report transactions that occur between January 1 and December 31 of the previous tax year from financial products such as life insurance or annuities. These transactions typically include, but are not limited to:</p>\r\n                    <ul>\r\n                      <li>Distributions (e.g., required minimum distributions (RMDs), loans from nonqualified annuities, full or partial surrenders, annuitization payments, and annuity claim proceeds).</li>\r\n                      <li>Collateral assignments or taxable ownership changes on nonqualified annuities.</li>\r\n                    </ul>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "1DDF3292763A4D8EADF8251DC0E7B2D2",
                "heading": {
                  "jsonValue": {
                    "value": "Why is the “Taxable amount not determined” Box 2b checked?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>For a nonqualified annuity, Allianz Life of NY did not receive the after-tax contribution (cost basis) information from the previous company. Please consult a tax professional to determine this amount.</p>\r\n                    <p>This box is also generally checked for a distribution from an IRA (Traditional, SEP, SIMPLE or Roth). If you have made any nondeductible contributions to an IRA, you should consult your tax professional to determine how much of the IRA distribution should be reported as taxable income. The IRS instructions require reporting on IRS Form 1099-R in this manner.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "CFF7B0FA7B244B65ACC53AD578651830",
                "heading": {
                  "jsonValue": {
                    "value": "Why did I receive multiple Form 1099-Rs?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>If you received distributions from multiple contracts, you would get a Form 1099-R for each contract. Please refer to the “Account number” box on the Form 1099-R.</p>\r\n                    <p>The IRS requires the use of specific distribution codes for different types of distributions, which need to be reported separately. See your Form 1099-R instructions regarding Box 7 for IRS distribution code information.</p>\r\n                    <p>If you had a taxable distribution in more than one resident state in a calendar year, a separate Form 1099-R would generate for the distribution amount received while a resident of each state.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "09A38F364D234A48A95BCA4ADB36D256",
                "heading": {
                  "jsonValue": {
                    "value": "Why was the IRA distribution reported as a taxable event when it was sent to another company?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>If Allianz Life of NY did not receive IRA transfer paperwork and a letter of acceptance from the other company, even if the check was made payable to the other company, we report the transaction on Form 1099-R because we do not have confirmation that the distribution went directly into an IRA at another company. If the distribution did go directly into an IRA at another company, please provide us with confirmation of this from the receiving company. </p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "4871B77BC9A9453A89AD1C50A93AF7C4",
                "heading": {
                  "jsonValue": {
                    "value": "Why was the IRA distribution reported as a taxable event when I rolled it over to another company?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>If you perform an eligible 60 day rollover (indirect rollover), the IRS Form 5498 from the receiving company should report the receipt of the indirect rollover contribution. You should consult a tax professional for information on the proper income tax reporting of an indirect rollover from an IRA.</p>\r\n                    <p><span>Reminder</span>: If you complete an IRA-to-IRA indirect rollover, you generally cannot, within a 12-month period from the date you received the distribution, make another indirect rollover of a distribution from any of your IRAs to another IRA.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "2321BE8164D4432187FBE1E94BBEF007",
                "heading": {
                  "jsonValue": {
                    "value": "Why is there a taxable amount on a loan from a nonqualified annuity?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>A loan from a nonqualified annuity is considered a taxable event (if there were gains in the contract up to the amount of the loan), even if it was paid back in the same year. Your cost basis has been increased to the extent of any gain reported on Form 1099-R as taxable, so you will not be taxed on this amount twice.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "A0B23D52CE534785B2233A2666A4D635",
                "heading": {
                  "jsonValue": {
                    "value": "Why is there a taxable amount on a loan from a 403(b) annuity contract?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>If you defaulted on loan payments from a 403(b) contract, the remaining loan balance is reported as taxable; however, the loan is still outstanding.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "95EA422390BF43B3AEB326442A66F275",
                "heading": {
                  "jsonValue": {
                    "value": "I thought only my gains were taxable on a distribution from a nonqualified annuity. Why is the total distribution amount reported in Box 1 (Gross distribution)?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>The total distribution amount will be reported in Box 1 (Gross distribution), the taxable portion of the distribution will be reported in Box 2a (Taxable amount), and the non-taxable portion of the distribution – the portion attributable to any after-tax contribution (cost basis) – will be reported in Box 5.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "F3E3BB41CABA4C0CB55E090F95790796",
                "heading": {
                  "jsonValue": {
                    "value": "I did a section 1035 exchange of my nonqualified annuity or life insurance policy. Why did I get a Form 1099-R?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>A section 1035 exchange is reportable, but not taxable. The Form 1099-R is the supporting document to show the amount of gains and the cost basis amount, if known, that were sent to the other company. Box 2a will be 0.00 to show that this is a non-taxable transaction.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              }
            ]
          }
        }
      }
    }
  },
  {
    "placementIndex": 7,
    "uid": "eb4f4bff-1a8e-458d-9f55-0dffdb0d98d4",
    "componentName": "AllianzAccordion",
    "dataSource": "/sitecore/content/allianz/allianz-life/Home/new-york/tax-statement-frequently-asked-questions/Data/Tax FAQ group 03",
    "isContentResolved": true,
    "params": {
      "RenderingIdentifier": "form5498",
      "DynamicPlaceholderId": "8",
      "FieldNames": "Default"
    },
    "fields": {
      "data": {
        "datasource": {
          "id": "2FCDBA9491F34E4A8A5BBF213C704BA2",
          "heading": {
            "jsonValue": {
              "value": "IRS Form 5498"
            }
          },
          "primaryLink": {
            "jsonValue": {
              "value": {
                "href": ""
              }
            }
          },
          "children": {
            "total": 14,
            "pageInfo": {
              "hasNext": false,
              "endCursor": "MTQ="
            },
            "results": [
              {
                "id": "87FDF429595A4C22ADA43CE3E9E0F49C",
                "heading": {
                  "jsonValue": {
                    "value": "What is the purpose of the IRA Contribution Information Form? Why did I get this?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>As the issuer of the Individual Retirement Annuity (IRA), we are required to provide you and the IRS information on your contract annually. IRS Form 5498 is used for reporting IRA contribution information, such as contributions and rollovers to Traditional IRAs, Roth IRAs, SEP IRAs, and SIMPLE IRAs. Form 5498 is also used to report the year-end Fair Market Value information for your annuity. This form is <strong>for your records only</strong> and does not need to be attached to your submitted income tax return. The information on the form will be furnished to the IRS by the required due date.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "2E678C625A964E6FA1DE28FAB8AD4F8C",
                "heading": {
                  "jsonValue": {
                    "value": "I sent money from another IRA directly into this IRA at Allianz Life of NY. Why does the Form 5498 show no contributions?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>Money that was sent directly from one IRA into another IRA is considered a transfer. A transfer is not reported on Form 5498. The transfer amount is added into your Fair Market Value in Box 5. Since a transfer is also not reported on an IRS Form 1099-R, you should not receive a 1099-R from the previous company for a transfer.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "36AE6BFD85D54BADB6A61116CF791293",
                "heading": {
                  "jsonValue": {
                    "value": "I took receipt of money from another IRA and later placed it into this IRA at Allianz Life of NY. Where does this amount get reported on my Form 5498?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>An IRA-to-IRA indirect rollover occurs when money is received by you from one IRA and redeposited into another IRA within 60 days of receipt of the funds. You should receive a Form 1099-R from the distributing company. Allianz Life of NY reports any amount that it receives via this method in Box 2 (Rollover Contributions) on Form 5498. If any portion of this distribution is not redeposited within 60 days, this portion will be considered taxable and no longer qualifies as a rollover contribution. </p>\r\n                          <p><span>Reminder</span>: If you complete an IRA-to-IRA indirect rollover, you generally cannot, within a 12-month period from the date you received the distribution, make another indirect rollover of a distribution from any of your IRAs to another IRA.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "511251C9E0D54640A444857F81F0F6EB",
                "heading": {
                  "jsonValue": {
                    "value": "My employer made contributions to a SEP IRA. Are these contributions stated on this form?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>Any employer contributions will show as SEP IRA contributions. Employer contributions to a SEP IRA will be reported in Box 8. Any Traditional IRA contributions you make directly to the SEP IRA will be reported in Box 1. Employer contributions are required to be reported on the form for the year the contributions are received. Traditional contributions are reported on the form for the year for which the contributions were made.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "0BB5E09871B2425E86D69081A5F32300",
                "heading": {
                  "jsonValue": {
                    "value": "What is the amount that I am allowed to contribute to my Traditional IRA and/or Roth IRA for tax year 2026?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>The general limit – the most that can be contributed to your Traditional IRA and/or Roth IRA – is the lesser of the following amounts: $7,500.00 ($8,600.00 if you are age 50 or older) or your earned income for the year. Please consult a tax professional on specifics regarding contributions for Traditional IRAs, Roth IRAs, SEP IRAs, and SIMPLE IRAs.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "0D09C917EA85407195B3603D5D98CF75",
                "heading": {
                  "jsonValue": {
                    "value": "What is the due date (last date) that I can make a contribution for tax year 2025 to my Traditional IRA and/or Roth IRA?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>If your Traditional or Roth IRA contract allows for additional premium, your contribution must be sent to a company-approved mailing address and postmarked by the due date for filing your return for that year, not including extensions. For most individuals, contributions for 2025 must be postmarked no later than April 15, 2026. This date is always subject to change by the U.S. Department of the Treasury; we encourage you to speak with your tax professional if you have questions about your due date.</p>\r\n                          <p>An IRA contract must be established by the 2025 tax filing deadline (without extensions) for a contribution to be reported as a contribution on a 2025 IRS Form 5498. This means, for most individuals, a pending IRA contract must be issued no later than April 15, 2026 for a contribution to be reported as a contribution for 2024.</p>\r\n                          <p>If you have more than one Allianz Life of NY contract, please verify that you have specified the correct contract number. Allianz Life of NY does not accept starter checks. If you would like your contribution to be recorded for the 2025 tax year, please write “2025 contribution” on your check or in a letter of instruction. If “2025 contribution” is not on your check or letter of instruction, we will apply the money as a 2026 contribution. If you make a contribution for 2025 between January 1, 2026 and the April 15, 2026 tax return due date, your 2025 IRS Form 5498 will be updated to reflect the new contribution amount and will be mailed to you by May 31, 2026. </p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "7EBCEB86801C47DB901EE406724B6E55",
                "heading": {
                  "jsonValue": {
                    "value": "What if my employer makes a SEP IRA contribution for the 2025 tax year in 2026?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>SEP IRA contributions Allianz receives in 2026 will be reported on the 2026 Form 5498, even when the employer deducts the SEP contribution on their 2025 tax return. Please consult a tax professional for any questions related to this reporting.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "1E3B3419807C4242875D441B82CC80A5",
                "heading": {
                  "jsonValue": {
                    "value": "My contract is annuitized; why am I receiving this IRA Contribution Information form?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>As an issuer of the Individual Retirement Annuity (IRA), we are required to provide you and the IRS information on the contract annually. This is required even after annuity payments have begun. Typically, the Fair Market Value (FMV) in box 5 is the only information provided. </p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "7B8C98B2496047F296A610F9887E913D",
                "heading": {
                  "jsonValue": {
                    "value": "My contract is annuitized and I’m receiving annuity payments. What is my required distribution amount?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>Once your contract is annuitized, each annuity payment is considered your required minimum distribution (RMD). </p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "6AE2B94D89E44383BEC6CE2C5C3622CD",
                "heading": {
                  "jsonValue": {
                    "value": "If my contract is annuitized, and the annuity payments are more than what the required minimum distribution (RMD) from the contract would have been if it were not annuitized, can I use the excess to apply to RMDs from any other IRAs I own?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>Yes. SECURE 2.0 Act allows any excess RMD from the annuity payments to be applied toward any RMD due from other IRAs you may own. Please see your tax professional if you have questions on using any excess RMD from your annuity payments toward RMD for other IRA contracts you may own. </p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "69AD97E52D3742F1B71F16F9E11D9863",
                "heading": {
                  "jsonValue": {
                    "value": "How do I know if a required minimum distribution (RMD) is needed from my contract? What is the RMD age?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>If box 11 is checked on IRS Form 5498, then you are required to take an RMD from your contract. An RMD may be required even if the box is not checked, such as from an (Inherited IRA). You can also ask your tax professional if an RMD is required from your contract. </p>\r\n                          <p>Note: As part of SECURE 2.0 Act of 2022, signed into law on December 29, 2022, the RMD age has changed for people who were born in 1951 or later. For those born in 1951 through 1959, their first RMD will not be due until they turn age 73. For those born in 1960 or later, their first RMD will not be due until they turn age 75.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "9A7EE29A3CB74438A36C48BEF1F0014C",
                "heading": {
                  "jsonValue": {
                    "value": "How do I know if required minimum distributions (RMDs) have been set up on my contract?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>If you have registered for an online account, this information can be found by logging in to our secured website. Once logged in, go to “My Policy,” select “Overview &amp; Values,” and scroll down to “Required Minimum Distribution Values” section. If the “Scheduled RMD” indicates “No,” then RMD payments have not been set up on the contract being viewed. </p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "919EF6992853410FB442F413FF77E07F",
                "heading": {
                  "jsonValue": {
                    "value": "How do I request my required minimum distribution (RMD) payment?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>If you have an RMD due in 2026, an RMD Election Form can be completed and submitted to us by mail or fax. The mailing address and fax number are provided on the form for your convenience. The RMD Election Form is provided below under the section titled “Forms.” </p>\r\n                          <p>If you have registered for an online account, you may have the ability to request RMD payments online by logging in to your secure account through our website. Under “My Policy,” select “Withdrawal Funds,” select “Start,” select “Setup RMD payment schedule,” and follow the prompts to complete the request. </p>\r\n                          <p>If you have an RMD due from an Inherited IRA and you are not currently set up for RMD payments, a Beneficial/Inherited IRA RMD Election Form can be completed and submitted to us by mail or fax. The mailing address and fax number are provided on the form for your convenience.</p>\r\n                          <p>You can also reach out to your financial professional to assist you in setting up RMD.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              },
              {
                "id": "2606B0FE23D34FD4B3D892083F7A42EA",
                "heading": {
                  "jsonValue": {
                    "value": "As a beneficiary who selected either a five-year or ten-year deferral option, am I required to take RMD?"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<p>If the qualified contract owner died on or after their Required Beginning Date (RBD), then you will need to take an RMD in 2026. If you are not already set up on RMD payments, you will need to request RMD payments starting in 2026. This can be done by completing the Five or Ten Year Deferral Withdrawal Form. The mailing address and fax number are provided on the form for your convenience.</p>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              }
            ]
          }
        }
      }
    }
  },
  {
    "placementIndex": 8,
    "uid": "6268a8ce-8907-4ed4-b5cb-8c3f11e5743c",
    "componentName": "AllianzAccordion",
    "dataSource": "/sitecore/content/allianz/allianz-life/Home/new-york/tax-statement-frequently-asked-questions/Data/Tax FAQ group 04",
    "isContentResolved": true,
    "params": {
      "RenderingIdentifier": "rmd",
      "DynamicPlaceholderId": "9",
      "FieldNames": "Default"
    },
    "fields": {
      "data": {
        "datasource": {
          "id": "F90EB142E0424A88B912617BDDAFAE6E",
          "heading": {
            "jsonValue": {
              "value": "Required minimum distribution (RMD)"
            }
          },
          "primaryLink": {
            "jsonValue": {
              "value": {
                "href": ""
              }
            }
          },
          "children": {
            "total": 1,
            "pageInfo": {
              "hasNext": false,
              "endCursor": "MQ=="
            },
            "results": [
              {
                "id": "75F039C8C7484E3A8D5958CC19755E0D",
                "heading": {
                  "jsonValue": {
                    "value": "Download the form below associated with your contract or policy and log in to upload the completed form."
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<ul>\r\n                                  <li><a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/8e35ad4113de4c7f88a73028fc20067b?v=302ecdcc\" target=\"_blank\">Fixed annuity – RMD request</a></li>\r\n                                  <li><a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/8e35ad4113de4c7f88a73028fc20067b?v=302ecdcc\" target=\"_blank\">Variable Annuity – RMD request</a> (contracts that begin with V)</li>\r\n                                  <li><a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/4550d91f2a834c6c947389b32b34fdc2?v=b51eeae8\" target=\"_blank\">Variable Annuity – RMD request</a> (contracts that begin with A, D, or G)</li>\r\n                                </ul>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              }
            ]
          }
        }
      }
    }
  },
  {
    "placementIndex": 9,
    "uid": "091d7b20-a2e3-4c4c-86e8-cad7bcff6f90",
    "componentName": "AllianzAccordion",
    "dataSource": "/sitecore/content/allianz/allianz-life/Home/new-york/tax-statement-frequently-asked-questions/Data/Tax FAQ group 05",
    "isContentResolved": true,
    "params": {
      "RenderingIdentifier": "forms",
      "DynamicPlaceholderId": "10",
      "FieldNames": "Default"
    },
    "fields": {
      "data": {
        "datasource": {
          "id": "EF616A8573A84292B52DF302CFD94692",
          "heading": {
            "jsonValue": {
              "value": "Forms"
            }
          },
          "primaryLink": {
            "jsonValue": {
              "value": {
                "href": ""
              }
            }
          },
          "children": {
            "total": 1,
            "pageInfo": {
              "hasNext": false,
              "endCursor": "MQ=="
            },
            "results": [
              {
                "id": "307C0B896BA64B3C943D6A9C6AEA671D",
                "heading": {
                  "jsonValue": {
                    "value": "Download the form"
                  }
                },
                "body": {
                  "jsonValue": {
                    "value": "<ul>\r\n                                  <li><a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/a174c87c8bb84e968db39e737126280b?v=642c9495\" target=\"_blank\">State Tax Withholding Guide</a></li>\r\n                                  <li><a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/3f699c30d29249bb9b63661615eae1ca?v=f28fb494\" target=\"_blank\">Federal Tax Withholding for Beneficiaries</a></li>\r\n                                  <li><a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/ba5afb210c38448c9c2a66f9943395d5?v=00ecc9d7\" target=\"_blank\">Transfer of Ownership Request</a></li>\r\n                                </ul>"
                  }
                },
                "link": {
                  "jsonValue": {
                    "value": {
                      "href": ""
                    }
                  }
                }
              }
            ]
          }
        }
      }
    }
  }
];
const heldBodies = [
  {
    "componentName": "AllianzAccordion",
    "datasourceId": "4A4DE2A435EA49B2802C4AD7426758EA",
    "entryId": "0F6AB9BFF0C2482F8BE7368DF0A18A10",
    "field": {
      "value": "<p>We encourage all clients to plan ahead to avoid delays with physical mail that could negatively impact your life insurance policy. This includes the potential cancellation or nonrenewal of policies due to nonpayment of premium. Here are steps you can take to help protect yourself:</p>\r\n<p><strong>Know when payments are due</strong>. If you’re not sure when premium is due or how much you need to pay, contact us or confirm with your financial professional. You can also find past premium payment information by registering or logging in to our website.</p>\r\n<p><strong>Schedule secure automatic premium payments</strong>. Avoid mail delays with recurring automatic payments. Register or log in to access these forms online.</p>\r\n<p><strong>Use direct deposit to receive secure electronic payments</strong>. Save time and skip the bank line by signing up for direct deposit for one-time and recurring withdrawals. Register or log in to access these forms online.</p>\r\n<p><strong>Make a phone payment</strong>. You can call us to process an authorized debit of your bank account by phone. When you make a payment, write down confirmation numbers, print receipts, and/or take screen shots. We do not currently accept payments through our website.</p>\r\n<p><strong>Keep proof of payment/mailing.</strong> If you must use the United States Postal Service (USPS) to pay premium, allow significant additional time and protect yourself by using the priority mail service or by securing a Certificate of Mailing. These can be obtained at any USPS kiosk or service counter.</p>\r\n<strong><span>Sign up for online document delivery</span></strong><span>. You can sign up to receive notifications when new statements and other correspondence is available online. To do so, register or log in to your account, click on your name in the upper-right corner, and select “Delivery Preferences” from the drop-down menu. <span style=\"text-decoration: underline;\">Please note that email notifications are not available for premium payment updates.</span> You will still receive a physical notice by mail and can call us anytime to coordinate payment by phone.</span> <br />\r\n<br />\r\n<em>Note: While applicable to clients in every state, this information is provided in partnership with the Maryland Insurance Administration based on a recent <a rel=\"noopener noreferrer\" href=\"https://insurance.maryland.gov/Insurer/Documents/bulletins/21-08-United-States-Postal-Service-delays.pdf\" target=\"_blank\">consumer advisory notice.</a></em>"
    }
  },
  {
    "componentName": "AllianzAccordion",
    "datasourceId": "D4F514408EDA4FB1A1A8F1DBE6AA30A7",
    "entryId": "870B42DD53AD4CA7AEAEE5CDD4B23ADB",
    "field": {
      "value": "<p> <a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/e03e7d2478bc40a18790461977c353aa?v=3d1480f4\" target=\"_blank\"> Allianz Life Accumulator™ consumer brochure (PDF) </a> </p> <p> <a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/85d75b47a5824cff8ad96f47692e160b?v=ca2d2740\" target=\"_blank\"> Six diversified strategies for your IUL (PDF) </a> </p> <p> <a href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/dc332c4b8b754614bc5aad1aecd97b9d?v=5d29628c\" target=\"_blank\"> Interest bonuses to help increase accumulation potential (PDF) </a> </p>"
    }
  }
];
const futureTeamsBody = "<p><a href=\"https://www.dplfp.com/\" target=\"_blank\"> DPL Financial Partners </a></p> <p><a href=\"https://simplicityoid.com/\" target=\"_blank\"> Simplicity OID </a></p> <p><a href=\"https://haloinvesting.com/annuities/\" target=\"_blank\"> Halo Investing </a></p> <p><a href=\"https://www.ria-insurancesolutions.com/\" target=\"_blank\"> RIA Insurance Solutions </a></p>";
const unapprovedPartnerBody = futureTeamsBody.replace(/href="([^"]*)"/g, (_, href) => `href="${href}?unrecorded=1"`);


test('finite fixture contains only exact consumer ownership and raw href records, with two URI-free exclusions', () => {
  assert.deepEqual(Object.keys(fixture).sort(), ['assetOwners', 'excludedBodyOwners']);
  assert.equal(createHash('sha256').update(fs.readFileSync(new URL('./allianz-retained-native-body-assets.fixture.json', import.meta.url))).digest('hex'),
    '9c9bfa325109ab96463aa7b53890d2dd57173009281af93afc9a98184e3ad9c8', 'the finite tuple table matches the reviewed provenance snapshot');
  assert.equal(fixture.assetOwners.length, 49);
  assert.equal(fixture.assetOwners.reduce((count, owner) => count + owner.hrefs.length, 0), 71);
  assert.equal(new Set(fixture.assetOwners.flatMap((owner) => owner.hrefs)).size, 50);
  assert.equal(fixture.excludedBodyOwners.length, 2);
  for (const owner of fixture.assetOwners) assert.deepEqual(Object.keys(owner).sort(), ['componentName', 'datasourceId', 'entryId', 'hrefs']);
  for (const owner of fixture.excludedBodyOwners) assert.deepEqual(Object.keys(owner).sort(), ['componentName', 'datasourceId', 'entryId']);
  assert.doesNotMatch(JSON.stringify(fixture), /e03e7d2478bc40a18790461977c353aa|insurance\.maryland\.gov|\/Users\//);
});

for (const owner of fixture.assetOwners) for (const href of owner.hrefs) {
  test(`finite raw asset ${owner.componentName}:${owner.entryId}:${href.split('/').at(-1)}`, () => {
    const input = freeze(syntheticField(`<a title="Authored > title" data-href="/Login" href='${href}' TARGET='_blank' rel="author" aria-label="Original PDF">Original <em>caption</em></a>`));
    assert.equal(policy.isRetainedNativeBodyAssetHref(href, context(owner)), true);
    assert.equal(policy.isUnavailableNativeBodyHref(href, href, context(owner)), false);
    for (const editing of [false, true]) assert.equal(policy.safeNativeBodyRichText(input, editing, context(owner)), input);
    assert.equal(policy.isRetainedNativeBodyAssetHref(href, { ...context(owner), entryId: '00000000000000000000000000000000' }), false);
    assert.equal(policy.isRetainedNativeBodyAssetHref(href, { ...context(owner), datasourceId: owner.entryId, entryId: owner.datasourceId }), false);
    assert.equal(policy.isRetainedNativeBodyAssetHref(href, { ...context(owner), componentName: owner.componentName === 'AllianzAccordion' ? 'AllianzCardGrid' : 'AllianzAccordion' }), false);
  });
}

test('owner validation accepts canonical GUID representations and rejects the old lax-normalizer trap', () => {
  const dash = (id) => id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
  for (const datasourceId of [first.datasourceId, first.datasourceId.toUpperCase(), dash(first.datasourceId), `{${dash(first.datasourceId)}}`, `{${first.datasourceId}}`])
    assert.equal(policy.isRetainedNativeBodyAssetHref(firstHref, { ...context(first), datasourceId }), true);
  const malformed = [undefined, null, 42, {}, { toString() { throw new Error('must not coerce IDs'); } }, '', ` ${first.datasourceId}`, `${first.datasourceId} `,
    `{${first.datasourceId}`, `${first.datasourceId}}`, `{{${first.datasourceId}}}`, `${first.datasourceId.slice(0, 4)}--${first.datasourceId.slice(4)}`];
  for (const id of malformed) {
    assert.equal(policy.isRetainedNativeBodyAssetHref(firstHref, { ...context(first), datasourceId: id }), false);
    assert.equal(policy.isRetainedNativeBodyAssetHref(firstHref, { ...context(first), entryId: id }), false);
  }
  assert.equal(policy.isRetainedNativeBodyAssetHref(firstHref), false);
  assert.equal(policy.isRetainedNativeBodyAssetHref(firstHref, { ...context(first), componentName: 'Other' }), false);
});

test('raw URL variations never inherit finite preservation or broad host approval', () => {
  const variants = [firstHref.replace(/v=[0-9a-f]+$/, 'v=ffffffff'), firstHref.replace(/\?v=.*$/, ''), `${firstHref}&extra=1`, `${firstHref}&v=9e703ece`, `${firstHref}#details`,
    firstHref.replace('https:', 'HTTPS:'), firstHref.replace('https:', ''), firstHref.replace('thlt-demo', 'THLT-DEMO'), firstHref.replace('.cloud/', '.cloud:443/'),
    firstHref.replace('https://', 'https://user@'), firstHref.replace('.cloud/', '.cloud./'), firstHref.replace('/content/', '/content/../content/'),
    firstHref.replace('/content/', '/content//'), firstHref.replace('/content/', '/%63ontent/'), firstHref.replace('https:', 'https&colon;'),
    firstHref.replace('/api/', '/api\\'), ` ${firstHref}`, `${firstHref}\n`, firstHref.replace('?v=', '%3fv=')];
  for (const href of variants) {
    assert.equal(policy.isRetainedNativeBodyAssetHref(href, context(first)), false, href);
    const input = syntheticField(`<a title="${firstHref}" data-href="${firstHref}" href="${href}" target="_blank">Original</a>`);
    const output = policy.safeNativeBodyRichText(input, false, context(first));
    assert.ok(output.value.includes('href="#service-unavailable" target=""'), href);
    assert.equal(output.metadata, input.metadata);
    assert.ok(input.value.includes(`href="${href}"`));
  }
});

test('the shared adapter preserves safe controls, exact parser attributes and immutable editing fields', () => {
  const body = `<a title=" href=/about target=_self " data-href="${firstHref}" HREF='&#47;Login' TARGET="_blank"><b>Account</b></a>`
    + `<a href='${firstHref}' target='_blank' rel='author' aria-label='PDF'>Asset</a>`
    + '<a href="/about?one=1&amp;two=2#details" target="_blank" rel="author">About</a>'
    + '<a href="/allianz-assets/b049bad91a3e5c1d-ENT-3301-N.pdf" target="_blank">Local PDF</a>'
    + '<a href="#demo-unavailable" target="_self">Existing</a><a href="#service-unavailable">Existing2</a>';
  const input = freeze(syntheticField(body));
  const result = policy.safeNativeBodyRichText(input, false, context(first));
  assert.equal(result.value, body.replace("HREF='&#47;Login' TARGET=\"_blank\"", 'href="#service-unavailable" target=""').replace('href="/about?one=1&amp;two=2#details" target="_blank"', 'href="/about?one=1&amp;two=2#details" target=""'));
  assert.equal(result.metadata, input.metadata);
  assert.equal(policy.safeNativeBodyRichText(input, true, context(first)), input);
  assert.equal(policy.safeNativeBodyRichText(undefined, false, context(first)), undefined);
  for (const value of ['', undefined]) {
    const empty = freeze({ value, metadata: meta });
    assert.equal(policy.safeNativeBodyRichText(empty, false, context(first)), empty);
  }
  assert.equal(safeLink({ value: { href: firstHref } }).value.href, '#service-unavailable', 'global General Link policy remains unchanged');
});

for (const captured of capturedCards) for (const mode of modes) test(`captured CardGrid ${captured.entryId} ${mode} preserves native asset tags`, () => {
  const original = structuredClone(captured.field);
  const data = freeze({ id: captured.rootId, children: { results: [{ id: captured.entryId,
    fieldCollection: [{ name: 'heading', jsonValue: { value: 'Minimal native Body fixture' } }, { name: 'body', jsonValue: original }],
  }] } });
  const before = JSON.stringify(data);
  cardCalls.length = 0;
  const html = renderSDK(Cards.Default, data, params, mode);
  for (const tag of captured.tags) assert.ok(html.includes(tag), `${mode}:${tag}`);
  const expected = restoreSourceDestinationRichText(original, mode === 'editing', captured.entryId);
  const call = cardCalls.find(({ field }) => field?.value === expected.value);
  assert.ok(call, 'the complete native Body is preserved except the existing source projection');
  if (mode === 'editing') assert.equal(call.field, original);
  assert.equal(JSON.stringify(data), before);
});

for (const group of capturedNY) for (const mode of modes) test(`captured NY ${group.placementIndex} ${mode} keeps PDFs and inerts only account services`, () => {
  const data = freeze(structuredClone(group.fields.data.datasource));
  const before = JSON.stringify(data);
  accordionCalls.length = 0;
  renderSDK(Accordion.Default, data, group.params, mode);
  for (const entry of data.children.results) {
    const original = entry.body.jsonValue;
    const expected = mode === 'editing' ? original.value : inertAccounts(original.value);
    const call = accordionCalls.find(({ field }) => field?.value === expected);
    assert.ok(call, `${mode}:${entry.id}: expected exact complete native Body`);
    if (mode === 'editing' || expected === original.value) assert.equal(call.field, original);
  }
  assert.equal(JSON.stringify(data), before);
});

for (const mode of modes) test(`source-approved partner paragraphs ${mode} retain exact links and native field identity`, () => {
  const original = freeze(syntheticField(futureTeamsBody));
  const data = freeze({ id: '11111111111111111111111111111111', children: { results: [{ id: '22222222222222222222222222222222', body: { jsonValue: original } }] } });
  accordionCalls.length = 0;
  renderSDK(Accordion.Default, data, params, mode);
  const call = accordionCalls.find(({ field }) => field?.value === futureTeamsBody);
  assert.ok(call);
  assert.equal(call.field.metadata, original.metadata);
  assert.equal(call.field, original);
});

test('source-approved partners do not grant native Body approval to URL or authority variants', () => {
  for (const [, href] of futureTeamsBody.matchAll(/href="([^"]*)"/g)) {
    assert.equal(policy.isRetainedNativeBodyAssetHref(href, context(first)), false,
      'global exact public-page approval does not add a finite native asset exception');
    const url = new URL(href);
    for (const variant of [`${href}unrecorded`, `${href}?unrecorded=1`, `${href}#unrecorded`, `${href}%2f`,
      href.replace('https:', 'http:'), href.replace(url.host, `${url.host}.example.invalid`),
      href.replace(url.host, `${url.host}:443`), href.replace('https://', 'https://user:password@')]) {
      const value = `<p><a href="${variant}" target="_blank">Original partner</a></p>`;
      const original = freeze(syntheticField(value));
      const result = policy.safeNativeBodyRichText(original, false, context(first));
      assert.equal(result.value, '<p><a href="#service-unavailable" target="">Original partner</a></p>', variant);
      assert.equal(result.metadata, original.metadata);
      assert.equal(policy.safeNativeBodyRichText(original, true, context(first)), original);
      assert.equal(original.value, value);
    }
  }
});

for (const owner of heldBodies) test(`held entire Body ${owner.entryId} stays outside this patch without URI admission`, () => {
  const original = freeze(structuredClone(owner.field));
  const ctx = context(owner), wrong = { ...ctx, entryId: '00000000000000000000000000000000' };
  assert.equal(policy.isExcludedNativeBodyOwner(ctx), true);
  assert.equal(policy.isExcludedNativeBodyOwner(wrong), false);
  assert.equal(policy.isExcludedNativeBodyOwner({ ...ctx, datasourceId: `${ctx.datasourceId.slice(0, 4)}--${ctx.datasourceId.slice(4)}` }), false);
  for (const editing of [false, true]) assert.equal(policy.safeNativeBodyRichText(original, editing, ctx), original);
  const data = freeze({ id: owner.datasourceId, children: { results: [{ id: owner.entryId, body: { jsonValue: original } }] } });
  for (const mode of modes) {
    accordionCalls.length = 0;
    renderSDK(Accordion.Default, data, params, mode);
    assert.ok(accordionCalls.some(({ field }) => field === original));
  }
  for (const match of original.value.matchAll(/href="([^"]*)"/g)) {
    assert.equal(policy.isRetainedNativeBodyAssetHref(match[1], ctx), false);
    assert.equal(policy.isUnavailableNativeBodyHref(match[1], match[1], wrong), true);
  }
});

test('Card passes raw owner IDs to the strict gate and all three layouts share preservation', () => {
  const data = (id) => ({ id, children: { results: [{ id: first.entryId, heading: { jsonValue: { value: 'Strict raw owner' } }, body: { jsonValue: syntheticField(`<a href="${firstHref}" target="_blank">PDF</a>`) } }] } });
  for (const layout of ['stacked', 'cards', 'list']) {
    const good = renderSDK(Cards.Default, freeze(data(first.datasourceId)), { ...params, layout });
    assert.ok(good.includes(`<a href="${firstHref}" target="_blank">PDF</a>`));
    const malformed = `${first.datasourceId.slice(0, 4)}--${first.datasourceId.slice(4)}`;
    const bad = renderSDK(Cards.Default, freeze(data(malformed)), { ...params, layout });
    assert.ok(bad.includes('<a href="#service-unavailable" target="">PDF</a>'));
  }
});

test('all 29 modern exports mount the shared Body policy with native editing identity', () => {
  const names = Object.keys(Accordion).filter((name) => typeof Accordion[name] === 'function');
  assert.equal(names.length, 29);
  const assetHref = accordionOwner.hrefs[0];
  const body = `<p><a href="/Login" target="_blank">Account</a><a href="mailto:example@example.invalid">Contact</a><a href="${assetHref}" target="_blank" rel="author">Asset</a>`
    + '<a href="/allianz-assets/b049bad91a3e5c1d-ENT-3301-N.pdf" target="_blank">Local PDF</a><a href="#demo-unavailable" target="_self">Existing</a></p>';
  for (const name of names) for (const value of [body, futureTeamsBody, unapprovedPartnerBody]) for (const mode of modes) {
    const original = freeze(syntheticField(value));
    const data = freeze({ id: accordionOwner.datasourceId, children: { results: [{ id: accordionOwner.entryId, heading: { jsonValue: { value: 'Synthetic native observer' } }, body: { jsonValue: original } }] } });
    let expected = mode === 'editing' || value === futureTeamsBody ? value : value === unapprovedPartnerBody ? inertAllPartners(value)
      : body.replace('href="/Login" target="_blank"', 'href="#service-unavailable" target=""').replace('href="mailto:example@example.invalid"', 'href="#service-unavailable"');
    // These existing source wrappers intentionally omit the datasource root and
    // have no native asset anchors. Missing root never inherits a finite exception.
    if (mode !== 'editing' && ['AA5AllocationAnswers', 'AA5CreditingAnswers'].includes(name))
      expected = expected.replace(`href="${assetHref}" target="_blank"`, 'href="#service-unavailable" target=""');
    accordionCalls.length = 0;
    renderSDK(Accordion[name], data, params, mode);
    const call = accordionCalls.find(({ field }) => field?.value === expected);
    assert.ok(call, `${name}:${mode}:${value === body ? 'services/assets' : value === futureTeamsBody ? 'approved partners' : 'unapproved partners'}`);
    assert.equal(call.field.metadata, original.metadata);
    if (mode === 'editing') assert.equal(call.field, original);
  }
});
