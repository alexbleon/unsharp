// Blur filter
//

'use strict';

var MAXRADIUS = 100 + 1; // we define max radius == 100 + zero

var multipliersOfCount = new Uint16Array(MAXRADIUS);
for (var i = 0; i < multipliersOfCount.length; i++) {
  multipliersOfCount[i] = (65535 / (i * 2 + 1));
}

// calculate average from sum and count in sum
function average(sum, countElement) {
  return (sum * multipliersOfCount[countElement]) >> 16;
}

/*
 blur go horizontal and result save in vertical
 (calculate average for each pixel)
 use border for pixel which is out of the image (src)
*/
function boxBlur(src, dest, srcW, srcH, radius) {
  var y, x, srcI = 0, n, startRow = 0, endRow = 0, destI = 0;
  for (y = 0; y < srcH; y++) {
    // pre init neighbor
    startRow = srcI;
    endRow = srcI + srcW - 1;
    var neighbor = radius * src[startRow];
    for (n = 0; n < radius + 1; n++) {
      neighbor += src[startRow + n];
    }
    // destI is insead of (x*srcH + y)
    destI = y;
    // calc sum for index which have virtual -radius neighbor
    for (x = 0; x < radius + 1; x++) {
      // calc aver
      dest[destI] = average(neighbor, radius);
      // add left neighbor sub right neighbor
      neighbor += src[srcI + radius + 1];
      neighbor -= src[startRow];
      srcI++;
      destI += srcH;
    }
    // calc sum for index which is in range -radius < i < +radius neigbour
    for (x = radius + 1; x < srcW - radius; x++) {
      // calc aver
      dest[destI] = average(neighbor, radius);
      // add left neighbor sub right neighbor
      neighbor += src[srcI + radius + 1];
      neighbor -= src[srcI - radius];
      srcI++;
      destI += srcH;
    }
    // calc sum for index which have virtual +radius neighbor
    for (x = srcW - radius; x < srcW; x++) {
      // calc aver
      dest[destI] = average(neighbor, radius);
      // add left neighbor sub right neighbor
      neighbor += src[endRow];
      neighbor -= src[srcI - radius];
      srcI++;
      destI += srcH;
    }
  }
}


function blur(src, srcW, srcH, radius) {
  var tmp = new Uint16Array(src.length);
  var output = new Uint16Array(src.length);
  boxBlur(src, tmp, srcW, srcH, radius);
  boxBlur(tmp, output, srcH, srcW, radius);
  boxBlur(output, tmp, srcW, srcH, radius);
  boxBlur(tmp, output, srcH, srcW, radius);
  return output;
}

module.exports = blur;
