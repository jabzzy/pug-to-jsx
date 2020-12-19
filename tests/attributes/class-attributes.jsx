<div className={'content'}></div>;
var classes = ['foo', 'bar', 'baz'];
<a className={classes}></a>;
<a className={'bang'} className={classes} className={['bing']}></a>;
var currentUrl = '/about';
<a className={{
  active: currentUrl === '/'
}} href={'/'}>Home</a>;
<a className={{
  active: currentUrl === '/about'
}} href={'/about'}>About</a>;
