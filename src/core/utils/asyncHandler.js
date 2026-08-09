/**
 * Asenkron Express route/controller fonksiyonlarındaki hataları otomatik olarak
 * catch bloğu olmadan Express'in next() fonksiyonuna ileten yardımcı (wrapper).
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default asyncHandler;
