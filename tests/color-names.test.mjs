import test from 'node:test';
import assert from 'node:assert/strict';
import { uniqueColors, exactColorProducts } from '../src/features/colorLab/colorNames.js';
import { productColorName } from '../src/features/colorLab/catalog.js';
const profile = (id, name, productId) => ({ id, name, productId, hex: '#DAD7D6', pigments: [], aliases: [], ka: 'თეთრი' });
test('one Titanium White name represents dry pigment, acrylic and oil without duplicate palette entries', () => {
  const colors = uniqueColors([profile('shop-1','Titanium White',1),profile('14101','Titanium opaque white'),profile('paint-2','titanium white',2),profile('paint-3','Titanium White',3)]);
  assert.equal(colors.length,1); assert.equal(colors[0].name,'Titanium White'); assert.deepEqual(colors[0].productIds,[1,2,3]); assert.equal(colors[0].memberIds.length,4);
});
test('a product must belong to the exact color name, not a similar shade or shared CI', () => {
  const colors = uniqueColors([profile('14101','Titanium opaque white'),profile('paint-1','Titanium White',1),profile('paint-2','Zinc Titanium White',2),profile('paint-3','White',3)]);
  assert.equal(colors.length,3);
  assert.deepEqual(exactColorProducts([{id:1},{id:2},{id:3}], [colors[0]]),[{id:1}]);
  assert.deepEqual(exactColorProducts([{id:1}], [profile('other','Unavailable White')]),[]);
});
test('real product shade labels retain Hue/Light/Pale/Deep modifiers and remove only packaging/brand', () => {
  for (const [name,expected] of [
    ['WINTON ზეთის საღებავი CADMIUM YELLOW PALE HUE Winsor & Newton 37მლ','CADMIUM YELLOW PALE HUE'],
    ['ზეთის საღებავი Maries 50მლ zinc titanium white','Zinc Titanium White'],
    ['აკრილის საღებავი Maries, Light lemon yellow 100მლ(248)','Light Lemon Yellow'],
    ['ზეთის საღებავი Marie`s lemon yellow 201','Lemon Yellow'],
    ['ზეთის საღებავი Maries 50მლ marie\'s yellow',"Marie's Yellow"],
    ['ტიტანის თეთრი, 500გ','Titanium White'],
  ]) assert.equal(productColorName({name}).toLowerCase(),expected.toLowerCase());
});
