import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveSiteMode,modeURL,modeSessionKey} from '../src/scripts/site-mode-state.ts';
const page='https://brandvm.github.io/seoteam-astro/';

test('explicit browse and review links override the saved session choice',()=>{
 assert.equal(resolveSiteMode(new URL(page+'?mode=browse'),'review'),'browse');
 assert.equal(resolveSiteMode(new URL(page+'?mode=review'),'browse'),'review');
 assert.equal(resolveSiteMode(new URL(page+'?mode=browse&view=comment'),'review'),'browse');
});
test('a bare URL restores the current tab preference and fresh sessions browse',()=>{
 assert.equal(resolveSiteMode(new URL(page),'review'),'review');
 assert.equal(resolveSiteMode(new URL(page),'browse'),'browse');
 assert.equal(resolveSiteMode(new URL(page),null),'browse');
 assert.equal(resolveSiteMode(new URL(page),'invalid'),'browse');
 assert.equal(resolveSiteMode(new URL(page+'?mode=invalid'),'review'),'review');
 assert.equal(modeSessionKey('/seoteam-astro/'),modeSessionKey('/seoteam-astro/index.html'));
 assert.notEqual(modeSessionKey('/seoteam-astro/'),modeSessionKey('/another-site/'));
});
test('old comment links migrate to the current review mode without losing their thread',()=>{
 const legacy=new URL(page+'?view=comment&v=area-comments&thread=42#services');
 const mode=resolveSiteMode(legacy,'browse');assert.equal(mode,'review');
 assert.equal(modeURL(legacy,mode).href,page+'?thread=42&mode=review#services');
 assert.equal(legacy.searchParams.get('view'),'comment');
});
test('switching modes preserves page parameters and removes review-only thread links in browse',()=>{
 const review=new URL(page+'?mode=review&thread=42&utm_source=team#services');
 const browse=modeURL(review,'browse');
 assert.equal(browse.href,page+'?mode=browse&utm_source=team#services');
 assert.equal(modeURL(browse,'review').href,page+'?mode=review&utm_source=team#services');
 assert.equal(modeURL(review,'review').href,review.href);
});
