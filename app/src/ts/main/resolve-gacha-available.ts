import { Client } from 'mishiro-core'

const client: Client = __non_webpack_require__('./export.js').getCache('client')

function getRarity (id: number, cardData: any[]): number {
  for (let i = 0; i < cardData.length; i++) {
    if (id === Number(cardData[i].id)) {
      return Number(cardData[i].rarity)
    }
  }
  return -1
}

export default async function (gachaAvailable: any[], cardData: any[], gachaData: any): Promise<{
  gachaAvailable: any[]
  count: {
    R: number
    SR: number
    SSR: number
    fes: boolean
  }
}> {
  let R = 0
  let SR = 0
  let SSR = 0
  const fes = (gachaData.dicription as string).includes('シンデレラフェス')
  let SSR_UP = 0
  let SR_UP = 0
  let REC = 0

  // 数据库没有数据时，直接从接口获取数据，不做数据统计
  if (!gachaAvailable.length) {
    try {
      // let gachaResponse = await client.getGachaRate(gachaData.id)
      const gachaResponse = { data_headers: { result_code: 0 }, data: [] }
      if (gachaResponse.data_headers.result_code !== 1) {
        console.log(`Get gacha odds failed. Code: ${gachaResponse.data_headers.result_code}`)
        return {
          gachaAvailable,
          count: { R, SR, SSR, fes }
        }
      }

      const idolList = (gachaResponse.data as any).idol_list
      const totalList = [...(idolList.r || []), ...(idolList.sr || []), ...(idolList.ssr || [])]

      for (let i = 0; i < totalList.length; i++) {
        const rarity = getRarity(totalList[i].card_id, cardData)
        gachaAvailable.push({
          rarity,
          reward_id: totalList[i].card_id,
          relative_odds: Number(totalList[i].charge_odds) * 10000,
          relative_sr_odds: totalList[i].sr_odds ? (Number(totalList[i].sr_odds) * 10000) : 0
        })

        if (rarity === 3) {
          R++
        } else if (rarity === 5) {
          SR++
        } else if (rarity === 7) {
          SSR++
        }
      }
      console.log(`gachaAvailable: ${totalList.length}`)
      return {
        gachaAvailable,
        count: { R, SR, SSR, fes }
      }
    } catch (err) {
      console.log(err)
    }
  }

  for (let i = 0; i < gachaAvailable.length; i++) {
    const v = gachaAvailable[i]
    gachaAvailable[i].rarity = getRarity(v.reward_id, cardData)
    if (gachaAvailable[i].rarity === 3) {
      R++
    } else if (gachaAvailable[i].rarity === 5) {
      SR++
      if (Number(gachaAvailable[i].up_value) === 1) {
        SR_UP++
      }
    } else if (gachaAvailable[i].rarity === 7) {
      SSR++
      if (Number(gachaAvailable[i].up_value) === 1) {
        SSR_UP++
      }
      if (gachaAvailable[i].recommend_order > 0) {
        REC++
      }
    }
  }

  if (gachaAvailable.length && gachaAvailable[0].relative_odds === 0) {
    try {
      const gachaResponse = await client.getGachaRate(gachaData.id)
      if (gachaResponse.data_headers.result_code === 1) {
        const idolList = (gachaResponse.data as any).idol_list
        const totalList = [...idolList.r, ...idolList.sr, ...idolList.ssr]
        if (totalList.length === gachaAvailable.length) {
          for (let i = 0; i < totalList.length; i++) {
            for (let j = 0; j < gachaAvailable.length; j++) {
              if (totalList[i].card_id === gachaAvailable[j].reward_id) {
                gachaAvailable[j].relative_odds = Number(totalList[i].charge_odds) * 10000
                gachaAvailable[j].relative_sr_odds = totalList[i].sr_odds ? (Number(totalList[i].sr_odds) * 10000) : gachaAvailable[j].relative_sr_odds
                break
              }
            }
          }
          console.log(`gachaAvailable: ${totalList.length}`)
          return {
            gachaAvailable,
            count: { R, SR, SSR, fes }
          }
        }
      }
    } catch (err) {
      console.log(err)
    }

    let R_ODDS = 850000
    let SR_ODDS = 120000
    let SSR_ODDS = 30000
    let R_ODDS_SR = 0
    let SR_ODDS_SR = 970000
    let SSR_ODDS_SR = 30000
    let SR_UP_ODDS = 0
    let SSR_UP_ODDS = 0
    let SR_UP_ODDS_SR = 0

    if (SSR_UP > 0 && SR_UP > 0) {
      if (SSR_UP === 1) {
        SSR_UP_ODDS = 7500
      } else if (SSR_UP === 2) {
        SSR_UP_ODDS = 8000
      }
      SR_UP_ODDS = 24000
      SR_UP_ODDS_SR = 200000
    }

    if (fes) {
      R_ODDS = 820000; SR_ODDS = 120000; SSR_ODDS = 60000
      R_ODDS_SR = 0; SR_ODDS_SR = 940000; SSR_ODDS_SR = 60000
      switch (REC) {
        case 1:
          SSR_UP_ODDS = 15000
          break
        case 2:
          SSR_UP_ODDS = 17500
          break
        default:
          SSR_UP_ODDS = 15000
          break
      }
    }

    for (let i = 0; i < gachaAvailable.length; i++) {
      const v = gachaAvailable[i]
      if (v.rarity === 3) {
        gachaAvailable[i].relative_odds = Math.round(R_ODDS / R)
        gachaAvailable[i].relative_sr_odds = Math.round(R_ODDS_SR / R)
      } else if (v.rarity === 5) {
        if (Number(v.up_value) === 1) {
          gachaAvailable[i].relative_odds = Math.round(SR_UP_ODDS / SR_UP)
          gachaAvailable[i].relative_sr_odds = Math.round(SR_UP_ODDS_SR / SR_UP)
        } else {
          gachaAvailable[i].relative_odds = Math.round((SR_ODDS - SR_UP_ODDS) / (SR - SR_UP))
          gachaAvailable[i].relative_sr_odds = Math.round((SR_ODDS_SR - SR_UP_ODDS_SR) / (SR - SR_UP))
        }
      } else if (v.rarity === 7) {
        if (fes) {
          if (Number(v.up_value) === 1) {
            if (v.recommend_order > 0) {
              gachaAvailable[i].relative_odds = (SSR_UP_ODDS - 7500) / REC
              gachaAvailable[i].relative_sr_odds = (SSR_UP_ODDS - 7500) / REC
            } else {
              gachaAvailable[i].relative_odds = Math.round(7500 / (SSR_UP - REC))
              gachaAvailable[i].relative_sr_odds = Math.round(7500 / (SSR_UP - REC))
            }
          } else {
            gachaAvailable[i].relative_odds = Math.round((SSR_ODDS - SSR_UP_ODDS) / (SSR - SSR_UP))
            gachaAvailable[i].relative_sr_odds = Math.round((SSR_ODDS_SR - SSR_UP_ODDS) / (SSR - SSR_UP))
          }
        } else {
          if (Number(v.up_value) === 1) {
            gachaAvailable[i].relative_odds = Math.round(SSR_UP_ODDS / SSR_UP)
            gachaAvailable[i].relative_sr_odds = Math.round(SSR_UP_ODDS / SSR_UP)
          } else {
            gachaAvailable[i].relative_odds = Math.round((SSR_ODDS - SSR_UP_ODDS) / (SSR - SSR_UP))
            gachaAvailable[i].relative_sr_odds = Math.round((SSR_ODDS_SR - SSR_UP_ODDS) / (SSR - SSR_UP))
          }
        }
      }
    }
  }

  return {
    gachaAvailable,
    count: { R, SR, SSR, fes }
  }
}
