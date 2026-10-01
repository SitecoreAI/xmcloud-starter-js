'use client';
import { Image, Link, Text } from '@sitecore-content-sdk/nextjs';
import { useReducer, useRef, useState, useSyncExternalStore } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { safeLink, type NavigationItem } from 'lib/allianz-fields';
import { AllianzFieldIcon } from 'lib/allianz-field-icon';
import { desktopMenuReducer, initialDesktopMenuState, initialMobileMenuState, mobileMenuReducer, navigationAtPath, type AllianzHeaderProps } from './allianz-header.props';

const mobileQuery = '(max-width: 703px)';
const subscribeViewport = (callback: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};

export const Default = ({ fields }: AllianzHeaderProps) => {
  const [menu, dispatchMenu] = useReducer(mobileMenuReducer, initialMobileMenuState);
  const isMobile = useSyncExternalStore(subscribeViewport, () => window.matchMedia(mobileQuery).matches, () => false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const searchToggle = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const [desktopMenu, dispatchDesktopMenu] = useReducer(desktopMenuReducer, initialDesktopMenuState);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHeader" />;
  const items = data.primaryNav?.targetItems ?? [];
  const activeNavigation = navigationAtPath(items, menu.path);
  const closeMenu = () => { dispatchMenu({ type: 'close' }); dispatchDesktopMenu({ type: 'close' }); };
  const focusNavigation = () => requestAnimationFrame(() => navigation.current?.querySelector<HTMLElement>('a:not(.m-nav-slide-back),button.allianz-nav-toggle')?.focus());
  const enterMobileMenu = (id: string) => { dispatchMenu({ type: 'enter', id }); focusNavigation(); };
  const renderNavigation = (items: NavigationItem[], level: number, collapsed = false, parentPath: string[] = []) => <ul id={parentPath.length ? `allianz-nav-${parentPath.at(-1)}` : undefined} data-level={level} className={level === 2 ? 'nav-list-nested' : ''} aria-hidden={collapsed ? true : undefined} inert={collapsed ? true : undefined}>
    {items.map((item) => {
      const children = item.children?.results ?? [];
      const path = [...parentPath, item.id];
      const isExpanded = path.every((id, index) => desktopMenu.path[index] === id);
      return <li key={item.id} className={isExpanded ? 'nav-list-open' : ''} onMouseEnter={() => children.length && dispatchDesktopMenu({ type: 'hover', path })} onMouseLeave={(event) => { if (children.length && !event.currentTarget.contains(document.activeElement)) dispatchDesktopMenu({ type: 'leave', path }); }}>
        <Link field={safeLink(item.link?.jsonValue)} aria-expanded={children.length ? isExpanded : undefined}>
          <Text field={item.title?.jsonValue} tag="span" />
        </Link>
        {children.length > 0 && <button type="button" className="allianz-nav-toggle" aria-label={`${item.title?.jsonValue?.value} submenu`} aria-expanded={isExpanded} aria-controls={`allianz-nav-${item.id}`} onClick={() => dispatchDesktopMenu({ type: 'toggle', path })}><i aria-hidden="true" className="c-icon c-icon--chevron-down" style={{ transform: isExpanded ? 'rotate(180deg)' : undefined }} /></button>}
        {children.length > 0 && renderNavigation(children, level + 1, !isExpanded, path)}
      </li>;
    })}
  </ul>;
  return <header className={`O-azl-header ${menu.open && isMobile ? 'm-navigation-primary-open' : ''}`} onKeyDown={(event) => {
    if (event.key !== 'Escape') return;
    if (searchOpen) { setSearchOpen(false); searchToggle.current?.focus(); }
    else if (menu.open) { closeMenu(); menuToggle.current?.focus(); }
    else if (desktopMenu.path.length) {
      let item = (event.target as HTMLElement).closest('li');
      while (item) {
        const opener = item.querySelector<HTMLButtonElement>(':scope > .allianz-nav-toggle');
        if (opener) {
          const id = opener.getAttribute('aria-controls')?.slice('allianz-nav-'.length);
          const index = desktopMenu.path.indexOf(id || '');
          dispatchDesktopMenu(index < 0 ? { type: 'close' } : { type: 'leave', path: desktopMenu.path.slice(0, index + 1) });
          opener.focus();
          return;
        }
        item = item.parentElement?.closest('li') ?? null;
      }
      dispatchDesktopMenu({ type: 'close' });
    }
  }}>
    <div className="m-navigationUtilityWrapper"><div className="l-container"><nav className="m-navigationUtility" aria-label="Utility navigation">
      <ul className="azl-nav-list logo-name"><li className="logo-icon"><NextLink href="/" aria-label="Allianz Life home"><Image field={data.logo?.jsonValue} /></NextLink></li><li><Text field={data.tagline?.jsonValue} /></li></ul>
      <ul className="azl-nav-list">{(data.utilityNav?.targetItems ?? []).map((item) => <li key={item.id}><Link field={safeLink(item.link?.jsonValue)} className="a-link"><span className="a-link__icon"><AllianzFieldIcon field={item.icon?.jsonValue} decorative /></span><span className="a-link__text"><Text field={item.title?.jsonValue} /></span></Link></li>)}</ul>
    </nav></div></div>
    <div className="header-wrapper l-container"><nav ref={navigation} id="allianz-main-navigation" className="m-navigation-primary" aria-label="Main navigation" aria-hidden={isMobile ? !menu.open : undefined} inert={isMobile && !menu.open ? true : undefined} onBlur={(event) => { if (!isMobile && !event.currentTarget.contains(event.relatedTarget as Node | null)) dispatchDesktopMenu({ type: 'close' }); }}>
      <a className={`m-nav-slide-back ${menu.open ? 'm-nav-show' : ''}`} href="#allianz-main-navigation" role="button" onClick={(event) => { event.preventDefault(); dispatchMenu({ type: 'back' }); if (menu.path.length) focusNavigation(); else menuToggle.current?.focus(); }} onKeyDown={(event) => { if (event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}><i aria-hidden="true" className="c-icon c-icon--arrow-left" /><span>{menu.path.length ? 'Back to previous menu' : 'Close menu'}</span></a>
      <h5 className={`m-nav-slide-title ${menu.open ? 'm-nav-show' : ''}`}>{isMobile && activeNavigation.parent ? <Text field={activeNavigation.parent.title?.jsonValue} /> : 'Main Menu'}</h5>
      {isMobile ? <ul data-level={menu.path.length + 1} className={menu.path.length ? 'nav-list-nested' : ''} style={{ left: 0, top: 0, position: 'relative', boxShadow: 'none' }}>
        {activeNavigation.items.map((item) => {
          const children = item.children?.results ?? [];
          return <li key={item.id}>
            <Link field={safeLink(item.link?.jsonValue)} onClick={(event) => { if (children.length) { event.preventDefault(); enterMobileMenu(item.id); } else closeMenu(); }} aria-haspopup={children.length ? true : undefined} aria-expanded={children.length ? false : undefined}><Text field={item.title?.jsonValue} tag="span" /></Link>
            {children.length > 0 && <button type="button" className="allianz-nav-toggle" aria-label={`Open ${item.title?.jsonValue?.value} submenu`} aria-expanded="false" onClick={() => enterMobileMenu(item.id)}><i aria-hidden="true" className="c-icon c-icon--chevron-right" /></button>}
          </li>;
        })}
      </ul> : renderNavigation(items,1)}
    </nav>
      <NextLink href="/" className="a-logo__svgLogo c-header__logo js-header__logo" aria-label="Allianz Life home"><Image field={data.logo?.jsonValue} /></NextLink>
      <div className="allianz-header-search">
        <button ref={searchToggle} type="button" className="allianz-text-button a-link" aria-expanded={searchOpen} aria-controls="allianz-header-search" onClick={() => { closeMenu(); setSearchOpen(!searchOpen); }}><i aria-hidden="true" className="c-icon c-icon--search" /><span>Search</span></button>
        {searchOpen && <form id="allianz-header-search" role="search" onSubmit={(event) => { event.preventDefault(); if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`); }}><label className="u-sr-only" htmlFor="allianz-search-query">Search this website</label><input autoFocus id="allianz-search-query" type="search" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} /><button type="submit" className="c-button c-button--primary">Search</button></form>}
      </div>
      <button ref={menuToggle} type="button" className="m-navigation-mobile-btn c-header__navigation-desktop-hide" aria-expanded={menu.open} aria-controls="allianz-main-navigation" aria-label={menu.open ? 'Close menu' : 'Open menu'} onClick={() => { dispatchMenu({ type: 'toggle' }); dispatchDesktopMenu({ type: 'close' }); setSearchOpen(false); if (!menu.open) focusNavigation(); }}><i aria-hidden="true" className={`c-icon c-icon--functional ${menu.open ? 'c-icon--close' : 'c-icon--bars'}`} /></button>
    </div>
  </header>;
};
