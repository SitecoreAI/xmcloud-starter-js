'use client';
import { useState } from 'react';
import AccessibleDialog from './AccessibleDialog';

/** Visual account-service mock: never accepts a username or password. */
export default function MockLogin() {
  const [isOpen, setIsOpen] = useState(false);
  return <div className="c-hero__loginFormContainer">
    <div className="cui-portletform clearfix"><div className="cui-portlet clearfix">
      {['Username', 'Password'].map((label) => <div className="l-grid__row" key={label}><div className="l-grid__column"><div className="form-group m-form-group u-margin-bottom-20">
        <label className="control-label a-input__label" htmlFor={`mock-${label}`}>{label}*</label>
        <input className="form-control a-input" id={`mock-${label}`} placeholder={label} disabled autoComplete="off" aria-label={`${label}: account access unavailable`} />
      </div></div></div>)}
      <div className="l-grid__row"><div className="l-grid__column"><div className="form-group m-form-group u-margin-bottom-20"><div className="checkbox"><label><input type="checkbox" disabled />Remember me</label></div></div></div></div>
      <div className="l-grid__row"><div className="l-grid__column"><button type="button" className="m-axlButton m-axlButton--direct" onClick={() => setIsOpen(true)}>Login</button><span className="o-axlLogin__registerNew"><button type="button" className="m-axlButton m-axlButton--tertiary" onClick={() => setIsOpen(true)}>Register</button></span></div></div>
      <div className="l-grid__row"><div className="l-grid__column"><div className="u-margin-bottom-20"><div className="o-axlLogin__linkGroup"><span className="o-axlLogin__linkGroupItem"><button type="button" className="a-azLink --capitalize allianz-text-button" onClick={() => setIsOpen(true)}>Forgot username?</button></span><span className="o-axlLogin__linkGroupItem"><button type="button" className="a-azLink --capitalize allianz-text-button" onClick={() => setIsOpen(true)}>Forgot password?</button></span></div></div></div></div>
      {isOpen && <AccessibleDialog titleId="mock-login-title" onClose={() => setIsOpen(false)}><h2 id="mock-login-title">Account access</h2><p>Online account access is unavailable on this site. Please contact customer service for assistance.</p><button type="button" className="m-axlButton m-axlButton--direct" onClick={() => setIsOpen(false)}>Close</button></AccessibleDialog>}
    </div></div>
  </div>;
}
