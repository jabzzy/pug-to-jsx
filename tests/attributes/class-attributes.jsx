export const ClassAttributes = () => {
  var classes = ['foo', 'bar', 'baz'];
  var currentUrl = '/about';
  return <>
    <div className={'content'}></div><a className={classes}></a><a className={'bang'} className={classes} className={['bing']}></a><a className={{
      active: currentUrl === '/'
    }} href={'/'}>Home</a><a className={{
      active: currentUrl === '/about'
    }} href={'/about'}>About</a>
  </>;
};
