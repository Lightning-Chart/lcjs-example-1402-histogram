window.lcjsSmallView = window.devicePixelRatio >= 2
const lcjs = require('@lightningchart/lcjs')
const { lightningChart, AxisTickStrategies, FormattingFunctions, isHitRectangle, Themes } = lcjs

// Function for generating normally distributed data
const generateGaussianRandom = (length) => {
    const samples = []
    for (let i = 0; i < length; i++) {
        let u = 0,
            v = 0,
            s = 0
        while (s === 0 || s >= 1) {
            u = Math.random() * 2 - 1
            v = Math.random() * 2 - 1
            s = u * u + v * v
        }
        const temp = Math.sqrt((-2 * Math.log(s)) / s)
        const sample = u * temp
        samples.push(sample)
    }
    return samples
}

// Function for calculating histogram bins from 1D numerical array
const calculateHistogramBins = (numberArray, numberOfBins) => {
    let minValue = Number.MAX_SAFE_INTEGER
    let maxValue = -Number.MAX_SAFE_INTEGER
    for (let i = 0; i < numberArray.length; i++) {
        minValue = Math.min(minValue, numberArray[i])
        maxValue = Math.max(maxValue, numberArray[i])
    }
    const binSize = (maxValue - minValue) / numberOfBins
    // Map each bin separately
    const bins = []
    for (let i = 0; i < numberOfBins; i++) {
        const binStart = minValue + i * binSize
        const binEnd = minValue + (i + 1) * binSize
        bins.push({
            binStart: Math.round(binStart * 100) / 100,
            binEnd: Math.round(binEnd * 100) / 100,
            values: Array(),
        })
    }
    bins[numberOfBins - 1].binEnd = maxValue
    numberArray.forEach((value) => {
        const binIndex = Math.floor((value - minValue) / binSize)
        if (binIndex >= 0 && binIndex < numberOfBins) {
            bins[binIndex].values.push(value)
        }
    })
    return bins
}

const data = generateGaussianRandom(50000)
const bins = calculateHistogramBins(data, 20)

// Display using ChartXY + RectangleSeries
const chart = lightningChart({
            resourcesBaseUrl: new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'resources/',
        })
    .ChartXY({
        theme: (() => {
    const t = Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined
    return t && window.lcjsSmallView ? lcjs.scaleTheme(t, 0.5) : t
})(),
textRenderer: window.lcjsSmallView ? lcjs.htmlTextRenderer : undefined,
    })
    .setTitle('Histogram chart')
    .setUserInteractions({
        rectangleZoom: {
            y: false,
        },
        zoom: {
            y: false,
        },
    })
chart.axisX.setTitle('Age')
chart.axisY.setTitle('Count')
chart.axisX.setTickStrategy(AxisTickStrategies.Numeric, (strategy) =>
    strategy.setCursorFormatter((x) => {
        const bin = bins.find((bin) => x >= bin.binStart && x <= bin.binEnd)
        if (!bin) return ''
        return `[${FormattingFunctions.Numeric(bin.binStart, chart.axisX.getInterval())}, ${FormattingFunctions.Numeric(
            bin.binEnd,
            chart.axisX.getInterval(),
        )}]`
    }),
)

// NOTE: In actual app, can replace with: const barFillStyle = new SolidFill({ color: ColorRGBA(255, 0, 0) })
const barFillStyle = (() => {
    const v = chart.getTheme().pointSeriesFillStyle
    return typeof v === 'function' ? v(0) : v
})()
const barStroke = chart.getTheme().dataGridBorderStrokeStyle
const rectSeries = chart
    .addRectangleSeries({})
    .setName('Histogram series')
    .setDefaultStyle((figure) => figure.setFillStyle(barFillStyle).setStrokeStyle(barStroke))

bins.forEach((bin) => {
    const rectFigure = rectSeries.add({
        x1: bin.binStart,
        x2: bin.binEnd,
        y1: 0,
        y2: bin.values.length,
    })
})

// Override default cursor in order to position cursor at the top-center of each bar, rather than default position (center of rectangle)
rectSeries.setCursorBehavior({
    location: (info) => ({ x: (info.x1 + info.x2) / 2, y: info.y2 }),
})
