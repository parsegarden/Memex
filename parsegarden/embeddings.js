import * as utils from './utils'
import * as tf from '@tensorflow/tfjs'

import jsonData from '../parsegarden/pretrained/word-embeddings.json'

class WordEmbeddings {
    constructor(codes, centroids, vocabulary) {
        this.vocabulary = vocabulary
        this.centroids = centroids
        this.codes = codes
    }

    // _getVector returns the vector representation of a word as a tensor
    _getVector(word) {
        const index = this.vocabulary.indexOf(word)
        //console.log('VIJX', 'parsegarden', 'embeddings', '_getVector =>', { index, word })
        if (index === -1) {
            return tf.zeros([this.codes.shape[1] * this.centroids.shape[2]])
        }
        //console.log('VIJX', 'parsegarden', 'embeddings', '_getVector =>', { index, word })
        const codes = this._getSearchVector(index)
        const indices = tf.range(0, this.codes.shape[1], 1, 'int32')
        const search = tf.stack([indices, codes], -1)
        const vector = tf.gatherND(this.centroids, search).flatten()
        return vector
    }

    _getSearchVector(index) {
        return this.codes.gather([index]).as1D()
    }

    _transformSequence(words, sequenceLength) {
        const vectors = []
        for (let i = 0; i < words.length; i++) {
            vectors.push(this._getVector(words[i]))
        }
        let sequence = tf.stack(vectors)
        sequence = sequence.pad([
            [sequenceLength - words.length, 0],
            [0, 0],
        ])
        return sequence
    }

    // _getVector returns a Promise the vector representation of a word as a float array
    async getVector(word) {
        return this._getVector(word).data()
    }

    // getCosineDistance returns the cosine distance between two word vectors
    getCosineDistance(word1, word2) {
        const vec1 = this._getVector(word1)
        const vec2 = this._getVector(word2)
        const dotProduct = vec1.dot(vec2).asScalar()
        const abs1 = vec1.norm(2)
        const abs2 = vec2.norm(2)
        const cosineDistance = dotProduct.div(abs1).div(abs2)
        return cosineDistance.dataSync()[0]
    }

    // getNearestNeighbors returns the closest k words from a given word
    async getNearestNeighbors(word, k = 5) {
        const vector = this._getVector(word)
        return this._getNearestNeighbors(vector, k)
    }

    async _getNearestNeighbors(vector, k) {
        let neighbors = tf.tensor1d([])
        const abs = vector.norm(2).asScalar()
        // Precompute distances
        //console.log('precompute_distances')
        const lookupTable = this._computeDistances(vector)
        //console.log('precompute_distances')
        //await tf.nextFrame()
        await utils.wait(100)

        // Calculate distance for each word vector
        //console.log('calulate')
        const subdims = this.centroids.shape[0]
        const searchIndices = tf
            .range(0, subdims, 1, 'int32')
            .tile([this.vocabulary.length])
        const searchVectors = this.codes.flatten()
        const search = tf.stack([searchIndices, searchVectors], -1)
        let dotProducts = tf
            .gatherND(lookupTable[0], search)
            .reshape([this.vocabulary.length, -1])
        let abs1 = tf
            .gatherND(lookupTable[1], search)
            .reshape([this.vocabulary.length, -1])
        dotProducts = dotProducts.sum([1])
        abs1 = abs1.sum([1])
        neighbors = dotProducts.div(abs.mul(abs1.sqrt()))
        //console.log('calulate')
        //await tf.nextFrame()
        await utils.wait(100)

        // Get top K distances
        //console.log('topk')
        let { values, indices } = tf.topk(neighbors, k + 1)
        //console.log('topk')
        //await tf.nextFrame()
        await utils.wait(100)
        values = await values.data()
        indices = await indices.data()
        const nearestNeighbors = []
        for (let i = 1; i < indices.length; i++) {
            nearestNeighbors.push({
                word: this.vocabulary[indices[i]],
                distance: values[i],
            })
        }
        return nearestNeighbors
    }

    async wordAnalogy(word1, word2, word3, k = 5) {
        let vector1 = this._getVector(word1)
        let vector2 = this._getVector(word2)
        let vector3 = this._getVector(word3)
        vector1 = vector1.div(vector1.norm())
        vector2 = vector2.div(vector2.norm())
        vector3 = vector3.div(vector3.norm())
        const vector = vector1.add(vector2).sub(vector3)
        return this._getNearestNeighbors(vector, k)
    }

    // _computeDistances computes the partial dot products and l2 distances of an embedding
    // from all the centres
    _computeDistances(vector) {
        const subdims = this.centroids.shape[0]
        vector = vector.reshape([subdims, -1])
        const squareSums = this.centroids.norm(2, 2).square()
        let dotProducts = []
        for (let i = 0; i < subdims; i++) {
            const codeword = vector.gather([i]).squeeze()
            const centers = this.centroids.gather([i]).squeeze()
            const dotProduct = codeword.dot(centers.transpose())
            dotProducts.push(dotProduct)
        }
        dotProducts = tf.stack(dotProducts)
        return [dotProducts, squareSums]
    }
}

export const loadModel = async function(url) {
    const model = jsonData
    console.log(
        'VIJX',
        'parsegarden',
        'embeddings',
        'loadModel =>',
        'Unpacking codes',
        model,
    )
    const codes = utils.unpackVectors(model.codes, 'int32')
    console.log('Unpacked codes', codes)
    //await tf.nextFrame();
    await utils.wait(100)
    console.log('Unpacking centroids')
    const centroids = utils.unpackVectors(model.centroids, 'float32')
    //await tf.nextFrame();
    await utils.wait(100)
    return new WordEmbeddings(codes, centroids, model.vocabulary)
}
