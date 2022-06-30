export const AttributeInterpolation2 = () => {
  var btnType = 'info';
  var btnSize = 'lg';
  return <>
    <button type={'button'} className={'btn btn-' + btnType + ' btn-' + btnSize}></button>
    <button type={'button'} className={`btn btn-${btnType} btn-${btnSize}`}></button>
  </>;
};
