// Unsharp mask filter
//
// http://stackoverflow.com/a/23322820/1031804
// USM(O) = O + (2 * (Amount / 100) * (O - GB))
// GB - gaussial blur.
//
// brightness = 0.299*R + 0.587*G + 0.114*B
// http://stackoverflow.com/a/596243/1031804
//
// To simplify math, normalize brighness mutipliers to 2^16:
//
// brightness = (19595*R + 38470*G + 7471*B) / 65536

'use strict';


var blur = require('./blur');


function clampTo8(i) { return i < 0 ? 0 : (i > 255 ? 255 : i); }

// Calculate lightness (in schema HSL) from rgb image
// return Lightness in diapason (0, 255)
function lightness(src, srcW, srcH) {
  var size = srcW * srcH;
  var result = new Uint16Array(size);
  var i, srcPtr;

  var max, min;
  var r, g, b;
  for (i = 0, srcPtr = 0; i < size; i++) {
    r = src[srcPtr];
    g = src[srcPtr + 1];
    b = src[srcPtr + 2];
    max = Math.max(r, g, b);
    min = Math.min(r, g, b);
    result[i] = Math.abs(255 - ((max + min) >> 1)); // calculate lightness (L) RGB->HSL
    srcPtr = (srcPtr + 4) | 0;
  }

  return result;
}


// max value of lightness
var LMAXVALUE = 255;

/*
 l - lightness (in shcema HSL) should be (0, LMAXVALUE)
 stroe in src new rgb 
 calculate new rgb according to change lightness before (l0) - after (l1)
*/
function correctLightness(src, index, l0, l1) {
  var ratioDeltaLightness = 65536, r, g, b;
  r = src[index];
  g = src[index + 1];
  b = src[index + 2];
  var max0 = Math.max(r, g, b), min0 = Math.min(r, g, b);
  if (l1 === 0) {
    ratioDeltaLightness = 0;
  } else if ((LMAXVALUE - Math.abs(2 * l0 - LMAXVALUE)) === 0) {
    ratioDeltaLightness = 1;
  } else {
    ratioDeltaLightness = (LMAXVALUE - Math.abs(2 * l1 - LMAXVALUE)) / (LMAXVALUE - Math.abs(2 * l0 - LMAXVALUE));
  }
  ratioDeltaLightness *= 65535;
  ratioDeltaLightness = factor | 0;

  var max1 = (((max0 - l0) * ratioDeltaLightness) >> 16) + l1;
  var min1 = 2 * l1 - max1;

  var r1 = 0, g1 = 0, b1 = 0;
  if (r == max0) {
    r1 = max1;
    if (g == min0) {
      g1 = min1;
      b1 = (((b - min0) * ratioDeltaLightness) >> 16) + min1;
    } else if (b == min0) {
      b1 = min1;
      g1 = (((g - min0) * ratioDeltaLightness) >> 16) + min1;
    }
  } else if (g == max0) {
    g1 = max1;
    if (r == min0) {
      r1 = min1;
      b1 = (((b - min0) * ratioDeltaLightness) >> 16) + min1;
    } else if (b == min0 ) {
      b1 = min1;
      r1 = (((r - min0) * ratioDeltaLightness) >> 16) + min1;
    }
  } else if (b == max0) {
    b1 = max1;
    if (r == min0) {
      r1 = min1;
      g1 = (((g - min0) * ratioDeltaLightness) >> 16) + min1;
    } else if (g == min0) {
      g1 = min1;
      r1 = (((r - min0) * ratioDeltaLightness) >> 16) + min1;
    }
  }
  src[index] = r1;
  src[index + 1] = g1;
  src[index + 2] = b1;
}

// Apply unsharp mask to src
function unsharp(src, srcW, srcH, amount, radius, threshold) {
  var x, y, diff, srcPtr, sdiff, l0, l1, r, g, b, newRgb;

  // Normalized delta multiplier. Expect that:
  var AMOUNT_NORM = Math.floor(amount * 255 / 50);

  // Cacl lightness and blur it
  var lght = lightness(src, srcW, srcH);
  var blured = blur(lght, srcW, srcH, radius);
  var fpThreshold = threshold;
  var ptr = 0;

  for (y = 0; y < srcH; y++) {
    for (x = 0; x < srcW; x++) {

      l0 = lght[ptr];
      l1 = blured[ptr];
      diff = l1 - l0;
      // Update source image if thresold exceeded
      if (Math.abs(diff) > fpThreshold) {
        srcPtr = ptr * 4;
        // calc storng diff and new rgb
        sdiff = (diff * AMOUNT_NORM) >> 8;
        l0 = Math.abs(255 - l0);
        l1 = clampTo8(l0 + sdiff);

        newRgb = correctLightness(src, srcPtr, l0, l1);
      }
      ptr++;

    } // end row
  } // end column
}


module.exports = unsharp;
