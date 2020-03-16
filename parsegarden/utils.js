import * as lzstring from 'lz-string'
import * as tf from '@tensorflow/tfjs'

export const unpackVectors = function(data, type) {
    const jsonData = JSON.parse(lzstring.decompressFromBase64(data))
    const array = tf.tensor(jsonData.vectors, jsonData.shape, type)
    return array
}

/*
export const fetchModel = async function (url) {
	return jsonData;
}
*/
