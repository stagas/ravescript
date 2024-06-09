import { $ } from 'signal-jsx'
import { compressUrlSafe, decompressUrlSafe } from 'urlsafe-lzma'
import { checksum, debounce, pick } from 'utils'
import { Project, ProjectData } from './dsp/project.ts'
import { getSourceId } from './source.ts'

function parse(timestamp: number, text: string) {
  const id = checksum(text)
  const res = decompressUrlSafe(text)
  const json = JSON.parse(res) as ReturnType<Lib['save']>

  const [
    title,
    creator,
    remix_of,
    bpm,
    pitch,
    tracks,
  ] = json

  // console.log(json)

  const project = Project({
    id,
    timestamp,
    title,
    creator,
    remix_of,
    bpm,
    pitch,
    tracks: tracks.map(([sources, notes, boxes, params], y) => ({
      sources: sources.map(code => ({ code })),
      notes: notes.map(([n, time, length, vel]) => ({
        n,
        time: Math.max(0, time),
        length,
        vel,
      })),
      boxes: boxes.map(([source_id, time, length, pitch]) => ({
        source_id,
        time: time + 1024,
        length,
        pitch,
      })),
      params: [
        {
          name: 'P0', values: [
            { time: 0, length: 8, slope: 1, amt:  1 },
            { time: 8, length: 8, slope: 1, amt: -1 },
            { time: 16, length: 8, slope: 1, amt:  0 },
          ]
        },
      ],
      // (params ?? []).map(([name, values]) => ({
      //   name,
      //   values: (values ?? []).map(([time, length, slope, amt]) => ({
      //     time,
      //     length,
      //     slope,
      //     amt,
      //   }))
      // })),
    })),
    comments: []
  })

  console.log(project)

  return project
}

class Lib {
  save = debounce(300, $.fn((json: ProjectData) => {
    const minified = [
      json.title,
      json.creator,
      json.remix_of,
      json.bpm,
      json.pitch,
      json.tracks.map((t, y) => [
        t.sources.map(s => s.code ?? ''),
        t.notes.filter(n => n.n != null).map(n => [
          n.n,
          n.time,
          n.length,
          n.vel,
        ] as const),
        t.boxes.map(b => [
          getSourceId(t.sources[y] ?? t.sources[0]), // b.source_id,
          b.time - 1024,
          b.length,
          b.pitch,
        ] as const),
        t.params.map(p => [
          p.name,
          p.values.map(v => [
            v.time,
            v.length,
            v.slope,
            v.amt,
          ] as const)
        ] as const),
      ] as const)
    ] as const

    if (json.tracks.length === 0) return minified
    // return minified // NOTE: temp
    const text = JSON.stringify(minified)
    const res = compressUrlSafe(text, { mode: 9, enableEndMark: false })
    const id = checksum(res)
    if (id === json.id) {
      console.log('[save] no changes - nothing to save')
      return minified
    }
    // console.log(res, res.length)
    history.replaceState({}, '', '?t=' + (new Date()).toISOString() + '&p=' + encodeURIComponent(res))
    console.log('[save] saved in url', location.href, location.href.length, 'bytes')
    return minified
  }))

  @$.fx save_on_change() {
    const { project } = $.of(this)
    const { data, tracks } = project.info

    const {
      id,
      timestamp,
      title,
      creator,
      remix_of,
      bpm,
      pitch,
    } = data

    const json: ProjectData = {
      id,
      timestamp,
      title,
      creator,
      remix_of,
      bpm,
      pitch,
      tracks: tracks.map(t => ({
        sources: t.info.sources.map(s => ({ code: s.code ?? '' })),
        notes: t.info.notesJson,
        boxes: t.info.boxes.map(b => ({
          source_id: b.info.source?.id ?? b.data.source_id,
          ...pick(b.data, [
            // 'source_id',
            'time',
            'length',
            'pitch',
          ]),
        })),
        params: t.data.params.map(p => ({
          ...p,
          values: p.values.map(v => ({ ...v }))
        }))
      })),
      comments: []
    }
    $()
    project.info.isLoaded = true
    this.save(json)
  }

  @$.fn boot() {
    const lib = this
    if (lib.project) return

    const searchParams = new URL(location.href).searchParams
    if (searchParams.has('p')) {
      const text = searchParams.get('p')
      if (text) {
        try {
          const time = new Date(searchParams.get('t')!).getTime()
          const project = parse(time, text)
          lib.project = project
          return
        }
        catch (e) {
          console.warn(e)
        }
      }
    }

    // const demo_p = `XQAAAAKWEAAAAAAAAAAtiKxZCEM6XjkWf4yJpenLxExDT6EdtNGciynV7oP8eIoYRkEafy16fKXfP1VSt0uc6sZzfvWF3rW_Xd1OS4cYVdSWXMQgICSxsXAUBI0jZmGJ7Rc14TxBdP-jh9TW5AfSE_dnmQ5mu6gxGLntr0-6BRgOQcmtkGXHeRw1RAHuEJwRubhLxkKqS5V1Kg7zyk2WoDWmmct2w2svfUkEiZWa9EXa1FMnIweaVLdNobMxNYIMDgkv6eFpVLZdhSOsSV6yDjJre2ZES-UjkyJYX4ywwA7Yf9WEDRUE8BJvaadH6z3Tf2G5vyt5PdcZ18XF6nGH0GVirm-PjJI8LhaM-h80B97g3ZjSUxSQ6VkOjVW39e8WBt_jZjFOOwdtVu6VMd8snQCAluX5NuiSnkjlXNFoHgrjuIONII9mJ0UbB75_OPvE6Yt0PrHhAkaKl1qfR9-QHozQwaqZ49e9tfQKbZaWIFZEwKVa6Gbam8z68ryuhtkkMgOh5JluPijljYKV2G9cUaUAkQ7PYo3P7BMbW5frEkE5o15AS98NYEY-JvFdVMvlvgDOYjqGIfMvOSDV4vcuK5NQFhWnFk0z0VSz1dYdN-ZrlbK9BCpTZVJxcRnnwPq6FpFlsOW6FEvGOWerFd3MKrFUOirU4ulWmcAaY5LbFW2Ff0qRzngmu90kYxsmG_8uG1qNgFuqmWXWeMNSNfGvQxxSwROdAHvl0SRLWXUwDBRhZS5M8pruU5AVs5otlUF-DHkruHO9mGARWfboAaCuABMVDvZsNKuJlIZRyFv27SbX1L9_v78nH75r_btR7SHyek2YYkcMAM7v9wBKkDVZkq-CZ9FWLJ3dI7AyPYWCgCdX78F6xFtqxvFlyGLPue1QuZRM4DEqBW5jE3xhaZLlz4Er_wiyrZT15jRQuZVY7v64jpgzyCGGfCIf_Xzs5gguius4cQcI6NF2EIbafjCubIxW-BM8Vsr1jIwR5eJX4PDlykqdPVhBC5W3kGaxJJle6h1UFQAahHuhfrzz0DuXEo5-CkkYRJ0_E-LWOXyOk14NJbLdB-u2hkR6Dk_FAU9cSG9G3WJNwT43IIoPCOTLWuPG_bBkzChumVre69cTaYSTKOKKgNKNDqRLRXCL8Pt-2ncTznZjeXfsXZAot3hT6eT8AA%253D%253D`
    // const demo_p = `XQAAAALMEAAAAAAAAAAtiKxZCEMyd9kuusGLU5bpJfm8fOKd8CK-6P7JqjpcIg7jfQndFh6w4ljcSTRzpcqtu_J4K4PbLDpp-ubiaOd22A-RPcUtrWFvE_pYu4pk4E896cvAOZ6gLGFdFK5deoc-jR27bupqCe80CJOPA8rx2sYZ6cYT6j68ymirLulM3Xw0D9r2wolx8b4hmcl0aMygEqFzeO-FLNWsykMZCYX4HaW1Nc55osK-td9d6f8jcs2FgDl4cxzhjOds4gmQvY1lHWnef7pANfyF3NnLLKI_AQMwQzLLzD_mRS1vInuJ2dQg5lJdmbTZOaHg91MS_gYLE5Esz_KZBNfn8T8flpnBuCLcba2vKdGkOAgzq6V9liDv97eHGQHjsmno8EX1kXaRJdtQVnlN_whOgxcIWKbpdYNR8SjkiazAN41WKOcS4m-Fsbvpa801fvpiGq-3qCh-dW1pIwpYOzFRVoICYBUiBP3GLONCLN0XS0-tt34NkPepuRYexA1Q9JNnJyOLIDODI0zrbUZIgdFdx9kSQHbwn75tb6e2U657MaWd3yV2s-emnS8kTgmoaSFi6vnlWhHN1rkABssau8iPK1-s9gNEGYmp7WXe9Qr8VdCDtNenuSMx3WPuhlrTgK4U3XUSLb9NUASxbtyMPITpEM8M11NxFCf8d8s87Als5rkQY29yapMQaDtTBI_HFylK5zjKPJkD2QdNunkezsCDY79G3TvFnej9di0-LEsgqAoJysDmzKV88lBy14fEu9Egj1VMAmCS0lfsQBg5vq0KoWUcS9i2kMCqvnzAXEiEFgL-AcM3YiY67XQFIvudOtnleCs6O6NTIYlqViI9E28Us92lM8rNCUj7ltFapf7qX7TGMICL4PjHYX8Re5azCSWDcXhILmUey3rp-7my_ReqYu-X0Ktgu6CK58PLBYbI0Gd5N5oRnEfbDZ1CgOHtyFpIpTX_Xqrpsl6Q54AhoJw8blibbRlPpdy_7_chkbbNMrPQGaD-nAWfxeE-JZbokOIAiZemBT40rkLGxOWOKRFngapTDWh5PL_DWHQtHjPwwo3i63YBfG2Ow6IsYgkGIeYsEUVMlB7QfO05ICj3YGFkrU1Z3tecCxGHSFuHV7TGyLo5rWiQwHcrTPyr_9jekUZovhdxcNutLL5snt5XWY3ljNNVn0B4f0NDAA%253D%253D`
    // const demo_p = `XQAAAALZEAAAAAAAAAAtiKxZCEMyd9kuusGLU5bpJfm8fOKd8CK-6P7JqjpcIg7jfQndFh6w4ljcSTRzpcqtu_J4K4PbLDpp-ubiaOd22A-RPcUtrWFvE_pYu4pk4E896cvAOZ6gLGFdFK5deoc-jR27bupqCe80CJOPA8rx2sYZ6cYT6j68ymirLulM3Xw0D9r2wolx8b4hmcl0aMygEqFzeO-FLNWsykMZCYX4HaW1Nc55osK-td9d6f8jcs2FgDl4cxzhjOds4gmQvY1lHWnef7pANfyF3NnLLKI_AQMwQzLLzD_mRS1vInuJ2dQg5lJdmbTZOaHg91MS_gYLE5Esz_KZBNfn8T8flpnBuCLcba2vKdGkOAgzq6V9liDv97eHGQHjsmno8EX1kXaRJdtQVnlN_whOgxcIWKbpdXVVQxiEvm0JiT5kQpSqPybTeMrCRMj_H2Bws0Z7pLH8pkEUQo-IgdOl2pCSWitA_VD1TQl8cxUqApC9uwW4DallyYtYydYFanX1AH2eBMSqgoBri2O3oZIYlxsFKeixdvPHiN7kV25CT20-NgEhIVgfBgbDJV7hqcAy15cyKFr8R9AiWLQTBYZfiZeHmcsqE_9Wbj2aNnfvwAQ0lFTUkNtK7B4X91vmQJtSwIqGRhLfcWMmRqIWX-ErKCn_2hYhMiN5Sb8LI71sZ44e_sltk-dPcRH07zfOyw38KFE9peQfNvG5HEaf25k3VWqk482HL6mI1Ni9FSj45yw-PhS-baHvNVAWAdH9y6KhocgQK3XLTD6jJq0a5ZeNw6gdc4pO2gIb4qary5OptyVVOj4QLc8z2BkQK56aHLaEgAvbnqWIfbDGNN6eWrv3Dal8G3tQ8SFczkH8tmYVkqeq9jBnkq7hoVXc73CeLi576OP02Ne0Fg2b_Dr-CqMix5SuWwHuZp6kWtELYBKisN4qsw4xq0JqsLrYHcDIj_QJ9HJGdspr5Q7xM4A1Al37BrVqwTk1RRWnDz2zcVisPKBHZDA7ih4Q6OIfvUoqEM1mkoU2iqhRumhfLFQXudVfhJ_xbM_Y5uz6EJVmzj2iO4jDT0LpBia0giUSNZwJQmA7o7xMBj50wBBxdTs3z6hUx3cRMfrKGrNfIq2W7lUmGpd7xjr43yOHP2I1Or5tzVhwKbCfcGCS9d8a2Ot-ogR7J-gvHVaAwrwbJYlpPv-AAA%253D%253D`
    // const demo_p = `XQAAAALZEAAAAAAAAAAtiKxZCEMyd9kuusGLU5bpJfm8fOKd8CK-6P7JqjpcIg7jfQndFh6w4ljcSTRzpcqtu_J4K4PbLDpp-ubiaOd22A-RPcUtrWFvE_pYu4pk4E896cvAOZ6gLGFdFK5deoc-jR27bupqCe80CJOPA8rx2sYZ6cYT6j68ymirLulM3Xw0D9r2wolx8b4hmcl0aMygEqFzeO-FLNWsykMZCYX4HaW1Nc55osK-td9d6f8jcs2FgDl4cxzhjOds4gmQvY1lHWnef7pANfyF3NnLLKI_AQMwQzLLzD_mRS1vInuJ2dQg5lJdmbTZOaHg91MS_gYLE5Esz_KZBNfn8T8flpnBuCLcba2vKdGkOAgzq6V9liDv97eHGQHjsmno8EX1kXaRJdtQVnlN_whOgxcIWKbpdXVVQxiEvm0JiT5kQpSqPybTeMrCRMj_H2Bws0Z7pLH8pkEUQo-IgdOl2pCSWitA_VD1TQl8cxUqApC9uwW4DallyYypwnErcK6XusbBECZT53FKxBh8Q8Je_67LOxkNwawcGdHQpnDTIQW4OEqes2DhJrwlBlCqlku2OZF5_ZhHP-daCTBL3DBznAQnCSkimhJQNT4PKtqmX0EQWHbYcC6XMlRdaVfAyIoecNN47BaJO97FTg4kcyaTI1CVbfchyTXs6oVhH_Pne2Mg1hsVBY9AxDT0Y8ZEtSAfPeOm_CGrb9Q_OTO_MQPDV7phqeHXJU83_ShO9m92PGknmN3ED2tGMg6KLrzbpzQEjRD8hzoVaoKwgqdkMkKVCodbpsQV6Edr6K8J5HMHljPQAceJ9KUGUrxYKPyHrt5ulQd2KEDQak0dGWVKW3K9aLhfGQG--jzVWOyY-Tm7KO0EQoWtH4ZbZnQPYDlsfOxFG-uUXvxLzrJC-CNcMVbZwWh2yoQitBj8jdvOQBpf-7tADNMMh4JPNhdWGLtorxBiAWOcDc_GxJFU_Qdr8omIBNyoJoyFL-RHl7m9BwRqBXsqMiq9BAZ8jRfMzzYWu3MHZBNkXaBib-wzrLtcmXST9y5HZ7rgcMy1iwmagnZJW3DdAnpRwc6Hlj61WRcV4jVPjrE_2u-TrWq9km5wckM3TeVpvxxOuGfMuWzj9Wp3mcjK9Q-m14IsmiAZFyYWbozEypwxsHlQDJx5w-IcrarUZk1qah3eYGlpBMnF6jqCQAA%253D`
    // const demo_p = `XQAAAAL6DAAAAAAAAAAtiKxZCEMyd9kuusGLU5bowhXCHrTZ3EcnnuhIX5gPEfgny_1JtLRn6GeOSSUb_3wMzqq3iMib52FGj4th0PTB6R2zoXhKAs8q4Qx9tuj2Z2tMLNkQ7FrPPUpyox0DLyS_XDMTBgJJ2q4tG11vZkKx55MD5cIhVfIVQiHhKxX66_zyVMP69tYxoP-hiZqgiimd0agcmt5t-PcN_bEUmKikNSOP0osnxBEZ0cD13bMxpJMb92khQwHfy7R9xbCix6FbGnaQfqqgiZEFznxWFYgvFQb_FVCbcIOAF_w6WM1qipFPfp2eTI0zRyUZVYStsn-g0e0M3Vk2Lf1FHa2GZWXKORt8hizjSVLAHIphGSK0mKNTmErH8R5mt1MOGyISvkNmzVeosHg-RobqIgdesWqH-j-cI7pffFm0u2cNCsMuzvDTEGnfug7fcj5u4D1JsUIfHDHk3bpyHfjTOBFIHoIQUP1zBKqtqCS2EigxGBUzZaCTZp8Ik_d5KFh8evuemNbvW9vrmwHJ26kRaWv5erV7FnsQfaLeiI6kvPOuitp0MgZnihHCJPR8wUm651N6RDqEzR8L0i3LRO7_pVY_8XOkIs4A_FYXTFLEqTuFGDqLugY2-eKMEyER_i_tMkBvmMsluATmlbRTVyAn8NMzjvwcgJtmxPIlvm_ysUPuhgEIM_q8RBkNT-awheViGK2lBhJrHxIxL9lMYZE0_lOZiivFIRExHQbLQMd_tk0AqMP13yTXst1ylLM8ql_FMNVKypktgTTuCbUU9Ku8cAVm7d2hy4Bi_mWyJC47TBNXkZLwUWbncZVK8K69VJpSRoWBV1177AQwp952fx4F-ygbs-yWvRleEd40--SCf7g5oNnIxMfhIifJX9nydA2nRk5mfNqdpLKcsT-Z7ZRHQsP-oTdbLRbDwVoZZEbVir9NV3iwDLAkJqW2dcoMOQcjT1GuiQ4vUQYnKBKHuXOCEjm502j15osSOBQy190mJbJD5TQDzpMwGmkoJOWet--2aHf8HAdaNwU58MwANHgoiST4nhBWLZieKJcrEfWeZT4AkRckxBwA4QJ4G58Cpvt2JFA2vmVjFDXiF2GFAenwpbnRYiQdH2cbA7QJPsDJdFtw93cma6LOtKkE3blCt3h0V0AnGX8zX1tcYprHEsL9lOjNfAvrF8TCAn4VK8ayEK8YloPJEYRGiSx6UbaSeCer0yYmbFwaWZOCzwOVdmrLCblFHAa29e3i8wlCVhFUIVWSE49Pn-CVcGqTBKHiFXxrN4S_acVGWFveeJeBTrKo8ZCTdTNdf-x1zNYXX2CI8PcW1cxmjT5kRngOEFq9rDGzpEoQR3hmxu4sdYN2UvK6KpUChl_GYBcB9xCAlFn_1lenINmi1M2DhupN0AuSp0qZm3EfE96jAA%253D%253D`

    // sub harmonics issue: XQAAAAJ-CwAAAAAAAAAtiKxZCEMyd9kuusGLU5bo9iWCnkCeoe9149BfdVlcvLDl8afE6h_WkuMo54INSKo3X4twaS8NGv3Mla-nSs-a_DmiTjvB_lUrpxY6x-0f52yh3LaJ7f5fhpAOqeYbJUY7tf8Am5hT1pWtOXAYgGpt8_nXY9mvWcYT_5uATPCQhAkyjN4uTHbJlBsi7z1PI7w1QFetxYQuI-03mtstcss2RIpsboMQr8wswY0AzUIiAwe73WAfAVWcQxgwa2XNXOon8SUfzMTIOsvqHYBtJSmf3gO6zF_Q1x7aZexHyjuIqbsx3guPa9Oa4XM-ySUom7U9mooyKvNVjhDr9uDqmviHemIJPW_Mjf5eWQISL4UUrgHvI_u9em1gDId7S_uc4eGlS3evUFzKqdvA_P42s9OpjWMy1PZL1QplJ-q8IB5NOE3MZ7OcTs0MVZXuiFex0pQUoR-6z381di_V6vWzXbboZ1Cwvp4MTr7sKYcV_QAfgnnOwttRryaXGbK7324kT45zjmmbcF5PN-CASUNM8rX3Y9SaNn3uhWLAx1y1u34MmIRUV5eQ2vqGrJvHftjMkpoo1GXWcaJYluxD4Z767B1jIUdAOGqU3DMD7E1dDDyzhEdk16Oz4Id3M6TeE4VyRHfHyzIPCd6cg2dXBC7P_tjwv9YM487GzgdWZFBf1W7f6SnG1DEEuse6-ZVBnYMm_akLceR-EAHBkWr5vKKz_4Jnm9GX8FTNxCPQWhw0jG0Ww-YB3o6GcPPgrIcB3Dri0knZxjnZ84I3xDg90NPtGXlcIAWL7EAQyWlXj8NlcqW7JxH9igY3cSkMmJ62iSNWWQgj8IUc9ILmE3MQlME56oGBeDKBwVhDCrg9lJdfzfgUe9GTz3yo_XBmNZAdNnO4GqIZFmX0ZYYx076N0PdONn8FXJf0VV7ZNsrSmtayoOFGJnQaQTM8nCopAVC9xUrVXMT6faoM2tlPvkFCD4n89CiSVdfqhDCTbUeN9jeU-hgrY--v4A54VudqK2VOGKasXgfsnBb4zoLLCEGafN1MIg8YGfbC8S1IwxEJ9IelCWky0Q4jLSD_nOs5Wfg0uJ5sXIOnjudZTTKfe6wKfmKYgaCwXwB5BXQ30wwsj7Y-W2boirRhp169cltOX1HQJXIFFa9rzS1ttacAVSoY-f79hdF_UBCFsECf9mQGk6rlURv_MaInpp4cDB5JZAX9SmgqR1A0SCIeDlJnsmZ-dSn07N0YAA%253D%253D

//https://devito.test:5173/?t=2024-04-14T19:23:08.693Z&p=XQAAAAI2DgAAAAAAAAAtiKxZCEMyd9kuusGLU5bowhXCHrTZ3EcnnuhIX5gPEfgny_1JtLRn6GeOSSUb_3wMzqq3iMib52FGj4th0PTB6R2zoXhKAs8q4Qx9tuj2Z2tMLNkQ7FrPPUpyox0DLyS_XDWlGOYo_7cTAIyGWnuzNQCtWWIqCKnyC7bX79FZzFk5EIIgTq6dGIFPgkLRvALOTOHIGlBJrtkQe7iisRp-c4oI-nLcirHEl6ggBkYBwEW6Z2ssh9Xxk75xfmjSZcSzElO-UNtFa6I43X_udjavIZIg9-YNtaBqoCH42M5gNU81cFbYLl47k7H5cZfXXvvnL61Phz0qPnflfOjh2XYf4zKIGXy2_KalljykCjGzCVPU3DsGEaT24PT764PbaJd4I4QBw82qM8xxP8ic0v6a3to9JyT_rGKheNfRic84uWJb-Ft52YcJkrz5sljehtdPFRl4U0gN6Q6XgV9EU8Ed6WFQRz0-cH8TlaY4zC8EzVxW3gwoO2eq6m-vl3Hvg7Uu4F5YPUG8u0JGt2108ZQ4U6x1WMMh8jijzgljHCin8Bek-XDmi2qikzDvt7rHOWrH7ildnJtu3JY4LQl8rylg4cBD8Ga-7Omo6__kcLVYCtjKiL6uqnKHh9VSkI67dofD-eRZORBrToH_tZsVt4Q2_MzZ81H13xUVkRyDF0qUhTCaOvxpKlCTqZKzise_11gWIUJA0sBEm_I3bNb0v616TXTwB8Pw4_7AYrVrVvscjXSzDTZPdqIC1RurlhZDEofNtVidgEsQfbhvnPtjOEnR09vYxFmdjg26kwWSZ9q15svl7bOhLxVvZWncJ6lgWLXX6xvBaAvI2fS3xAIymBkM-XoYn88TxeFR4DX9Ta-CKK8qK-Xz90OPX1VlDZq8a4auPm6itpLQhnO60lE0CtH4G05kNfaPhdnH-zLmJlIKroXPo_4Bbk3IZ9lBdHPTRDhyT7yzL-G2AUNAec2-sTjxevbXlxfQHaWuQWlGPptAYHjSjx8n7trF6KARkFleuGa20aIBSx5vCZ0n5O-IUkQ26FWdPVUtRF8aeYU7ld5tqTpFpUBvWaphsT1FG4uxxDF_FG0O7IoCRnL2H_7ddu5jkg4HnTrDy7rAu6201uvoqjvRUtn2VD77UTIus8dzcnn66ERYS4aTUbm48qmNOgAPnyvWWeIlnSPlbkQgj7akf-z6Lt_nS8gieYtlV9Hmcat9TfeNhtFLTQg10zL2bgo1kckjs3Y4W2u3NABcVwGjctpqZG90DdlmlXyXRIjuHR16alnSiFd48Cgl52KQYstf6BsWrTMg_ixE8280FuxGYGHma75h-f03l2KlmvKUWFI58MX1TNwdWYHQQuhECTEv7Xh_Z-GDMnBTf1HjomT7g8CjaF8OZAJkg1JFaapZy9wf77cODSXF4pxPU8ZX5PqcK5RvYtU6YaQDKszcL6KgqXUixOxam72gSdZIR9IvmJoYiIlxZz_YvfZnAr7l0-Jh0Q7AsAQVDOGPwWrAmubbuW4obVGXkDEMDjL7WrMQBwQA

//https://devito.test:5173/?t=2024-04-14T19:44:14.757Z&p=XQAAAAKrDgAAAAAAAAAtiKxZCEMyd9kuusGLU5bowhXCHrTZ3EcnnuhIX5gPEfgny_1JtLRn6GeOSSUb_3wMzg9-WBpFB3Z26p-OZcZi5y3xABQaDj9v0VNoNeYyp4__EgX0JES2J3gpkk9NSNA7N_w1etAU7w9434G7Av87e4wkgeXsbSRpZi8pM2n4mGv7Wo0n4cUaUi4YYKrB9LZlbsq4Iap1EgvkkPJviDeYo3Tp-c7dJjMnhpu7Vg34-KVZ74Syaz-Sfkt-6J4faTu2d0sDgQg9NW-VFp1WBW9zaNN_FPNc5r-pWkS43ycMl2-N7jsaAlsvO_kxtkEXhhR54SPiAwHFCT2WWUNMAXJ-5q-QGed7iRg49hv9Z2QzDT4Gr6Vn-izuajwi9Qvu9IBllOrFZkwi6KNc43Glaim7vwMnIq82mqmof4O1ds6gmGnMaNGVnF48uGtF5mRO4zzJ-Y5OH6WNWMSnzN9dfs4658NKH5O-X_PcqAd3ZRBDakkR0LWtvXFpEfRrNHn6LwTPmotlUeeaPu5jtok8y-h4mqMmwxbfr2ENqKqwlsqVcE_cwclCt9jKcC13zOaXoUHc5-rfwXNe72rrYhsngiwsDvOyNArFyRyCU4tEpREbdlbpiTAr_aBujfIq_PcALPCb_HwbPPK4-EUDmocIO4H3JPwfJMCDYXhSMj3scydjTDbRHlDBmtINWITmifGbIILXhF9FtG90MHlzc61S0UKZ5HZM2baq4NfYQCvYE9DGIYMUr2kn-vTB5i0u8RXl4SMpQAQvq8Z_KUvgzUl5i6zOLapksuhrsKf4u5rF7qqjBWpRjoN09fQ5sqsYdfk2l80j3ZnHnrlLFXfEzDkJCoUtK4vopePG0CdbaizN8hbaFwkSUjkbSFkfTw_p6tDlvenpwS6KQQvX_Tt_n_77bJNCWjy_GyTsbMNBC_SLaBO7MqMgqqhz0UsgOKPdEq_ipOy0GItOjGVpPUjuOIyY0w2w7cngAugiSR_rospFTkkO5Z8LAkKv-yljxArptctxgpEQq6U6bn7fp8SOV7v_EeonpkMm6zMPEfbSTHpjt0PqwnpKfR7Bk-u4jkTOSdlbLTCKtBOlFTf36e_olxyO7rVNXUci1C5UR8NFrEHTWU9nz8XIi1s4PSMjpoek8GLQUnUeAxo1uViBZdSAF5_DYNedDNCtFFC094gtTXi88RkyV30OWs-9hYRjj-IF2A3odAlxUcbct4zNMRI0pTLx7tW5MVUAglO02wV252OtvDXKaghcwEvXfJraGVMZXh_x2Ya0y-XbhhkPrLUHj30vQX-UKRwnho4kYBo59K8Wn_XGey19pE8DQD5XT8XcHu7e6Z-OWQywAawuIqaLPOjf3l2qE-PxdWqZIxGg9VUHylcD-USdtRZngizX7wPJA5DRIsneySrAIo9n921Tw4mv8XpZ_hLQUaxbVs3oDCh7jHWmDlqrSJNJbv7Ykqy8ZsFKo5-b16fm5IMZ3H-24DyiUHHUGMmSIQNIliTfZm-rlVCG-ju6zq_Xat9eKRj3M_NN44kDok5eTITVotVjGMYhCnNpLjF712ffOav-wPVUtmbdKzWd11rC8g2TmNKlhEAA

//https://devito.test:5173/?t=2024-04-14T20:32:41.469Z&p=XQAAAAJYDwAAAAAAAAAtiKxZCEMyd9kuusGLU5bowhXCHrTZ3EcnnuhIX5gPEfgny_1JtLRn6GeOSSWCu4Oja0dsGIyeUujC844YLpYgXNHPQomORB5zFuoh6wEzgUmHcEFqrwmUfG7LNFGITdIjYCs71bOEuG2TVbLx3AXAOqtnGxkzCGTfTdPWQx0Cw3mnxGWiyfD_ADhf6Mua8aLvD8cLcD02Xa-TiMO0evUkk-fz-KiA35301AsB3BQReB1pcC0Uv1g5djUXAAOwz-WHtKBYX8E58Ypv6RWz5ojH2x_GQEzLbN1Iylk_F5YTgZ7XybYpoDgBL088rbRu8gv9_NZbqHEW5EmjGvTXb4KNlu1sK2oe-cPdkszmZlTlANVdzsNauh5ddLux1dL9rw3wqm5DoSu9z2-uiIgJyxeX1Y_Zqhifd_-M_xdjT28Gm5X3zCxNk6w2h3cp7f8Abvu9eX2piCYZng4quTcDgxWIDf1mHYXmeOOJ-3V28AyUS406lrXceKiQAyVLee9AYGAJwA0aQYH7_0u91qwEABXsotNN3CrSMxywTu_lxCmgqmPTO_gGpbpYVMWSBTfL-aJI7diYBv0bFArWSpwXOoz48WdsWjnBKh-i3hpdGo6yVUWwEdouEj8XE9eXQYDzOblJUBxekjugq6OdFuc3A-o2dLlOtdwag622k5mLQoeRdoFlNUr2veBnd6Xb9IsiQOq9jIu8HrMMRpcEuKjXEXFGLWteWhObYU_2lbjDWVmG6NCo8B4HxzbOswDJDI6GfI7TJDYHZXCAWc3R38FXCKCvUBHoWvBj0vaoRWXwDMiunL0z4kf1OjLko3Iu-IArDy_aVS3Llt12RLstyJaCnti2PL1am8PdF825cMWqQIOOJEOefYDT_kYCpwp0d-AkEr4z2FE5l2JbSE77u40wxayc2_cxddmXkcVRCdLrbMSzzESoablxoo3_kygpOJD0kesUKJn5AI8mWN-esL6ZQLBbSpVwQFEKVreB_9ST3WXkYw-UHSoE0GfsVHEN-_8o2TKW5hyBB0-RWU3b9eHMAmUaoWkKQN6SWQyr-ZuJddsnOJ-qcf8LvZdA-hQJFWopmTbGoEB1HJpMWlXVbs9lVRAuEJL2ZG-rtIKJLLULTSKfLStZwbFVjnwgqoKS1JErKWTLs8XR1Odz8kAgfgI_RKbNuWw7XqCyZpxvHtRQv-Z6zYuYuVm3Pk_h5OsBq0mlb-aI-w6hMrWvQXTlQ8TvLAeas4BY7-oSKGwpnAYcyM7nJD8oCVvaOYRERCBs3eYEdfdW5zi2OiWdBWzrLJGfnL5dSVQedHS8uWDW6Hzqg5KPCpHOr9XTyGRPfO8iND1ei_gjvWlqPNGkSnFb-4yC50S4ONJV4_N4TyD4P6ojaRABNdDG-VlRtdgX4VswQF-KB0Tehb6CFIQ9M5bG9VoO7oMljh6xZuu_bWN9guzD9fPdipw7UtimuTP2ho8b3TihEl6ccNf7ADhfYjy6UmadZcPAmTUHKiKj_eGbbCED7QBrl_uI3g2SehRpsF5lEaEXULfhwh8-NLbMsQO22j55zRQ7JZPn6EkR0oOoOWdrQ7vLYcttYDk6twb0j4u0xH90KUsb6cJnkVoJrNBBma39SAVaxiDBob2ZSFIUGCLGWXF_t-9zSQJBcarT51z9wQQWpZV5_NxoZD579WgA

//https://devito.test:5173/?t=2024-04-16T04:51:58.324Z&p=XQAAAAJKEAAAAAAAAAAtiKxZCEMyd9kuusGLU5bowhXCHrTZ3EcnnuhIX5gPEfgny_1JtLRn6GeOSSUb_3wMzqq3iMib52FGj4th0PTB6R2zoXhKAs8q4Qx9tuj2Z2tMLNkQ7FrPPUpyox0DLyS_XDMTBgJJ2q4tG11vZkKx55MD5cIhVfIVQiHhKxX66_zyVMP69tYxoP-hiZqgiimd0agcmt5t-PcN_bEUmKikNSOP0osnxBEZ0cD13bMxpJMb92khQwHfy7R9xbCix6FbGnaQfqqgiZEFznxWFYgvFQb_FVCbcIOAF_w6WM1qipFPfp2eTI0zRyUZVYStsn-g0e0M3Vk2Lf1FHa2GZWXKORt8hizjSVLAHIphGSK0mKNTmEreQxdiaNmpyrSaFw3V8aMKd74EaHYp1KbWdDq-zt1Rlxu5NbQGIj5FeKbGs7CZiJegZRtl24GZ8D2ipPjQo9Y8jXKaoYV5UdfX6N0-NpuNdnX5Q54Sko2yWzg-5S4YnLdBeOi5if7x3mWBAjnBlNrJOdSGFyHyJce6AXdTrAeDO9PQirq8wBb6-KDIZ42gi6WMSXr59TTxs9dZnqFnkWsmyDbs2YOo__Pdy8gU21pqciPegnLqfPe0VrcuODF5SkF01s2GXmZq0JrnIKQuxtTvkgO3wExqS58QwyIkW-lg8nwbxICtT_QQdAyzTuAGwv71HCVnuvtwWa3gMHxEzHrYbp0tKslAomjrDu53iJkflgYha_tbTgiC_KsRwPD10eIhY_qZirirBjoXcspZDmTrXnWaIk1G66QCzxWIxWdgL79uvpUSSeE_pf9dyNRxvjDObBdzjvPOj-Wwr3YOJDGDiMW9dn2Y9Tk-vgU0GaS1kCLaXrk5PQ11Xjd95wXN1poNTlRUlgeEhFySOMUHGg3ofJSFWTqVQRr87QegfqIaatYZ9VytHdi_Y-v-NLnKOQFfowO9y-DkWtth33XTJUbTxzhI84JWMnbLG7AcI05LMo0gMBIVgsB8LmudwjWvp33pXdpujej8jK_m5yWb9hEmRCNeTRe2Gy7OV-FHS1YFWlavzBQu66za2MGH29_Wt3f7ZlxEq5XP0metfPLj-6lFS4gDrDF4DnpzfLOqNQWcVSJhiummURPnqddksZsWQiHT3-wUh9oopScX6eT9R052PEVyk-n-2Ak61ET9H54wBKLWdU8s4dCdSBdqT9PrbGdOgukMkBDT80C9nhIzjupenO4PvScUpfc4tkw6CQeEIAklOYMl3waynICT2uPhthzOoVagZnujD_LZsUiS8SKTBGoNZuSaxkgEuCZ3Z2vZJj8JeVDFAsWZIZ76NpfkeQqnxlnTXqRKyTwAGTXgfthR15NZje12l--t87JrrrLKubtT1wURYmaOT3McW73pCEtoMc5d6B9aJYksnQnhVWRCLcpvx_rZraRPDmJ7rQhdEz-ZHZXi2NEt8cUTVFJ8WoXbg29gSJ6Dh9Hom1Lm8rSJa7lRNKtRVm9A1syIyJc7eGuR22djVy-LALrLNL2UDWh7nJmD0LMHoYxUPdxDCp9BmYyv1QGBpdg-NzA0TKeOKFUejOVCOYQ-Ftzv1wA%253D

// open hat
//https://devito.test:5173/?t=2024-04-16T05:05:45.352Z&p=XQAAAALWEgAAAAAAAAAtiKxZCEMyd9kuusGLU5bowhXCHrTZ3EcnnuhIX5gPEfgny_1JtLRn6GeOSSUb_3wMzqq3iMib52FGj4th0PTB6R2zoXhKAs8q4Qx9tuj2Z2tMLNkQ7FrPPUpyox0DLyS_XDMTDyMsoHyIQXyj5Eq4WV91X75llPbWUf9J-vfkUQAVEBrOOgbxgbcnfxnWagpce2n3xa6SuGm9rC1SX5AftbLJ4oAJ5rL_OPeQhyjcbqznuMqB14lpzRllr8NK7LTerKL7Q-8j3fAzvrRUOPGUdsEweifoEgqQnoXC83GSzQpY4Y8zLDWe-IHwlWMvC0E5Tn77xTZlYz_v-aUTZZX6Bc7pCZqOerE6Qmh_tEi21NmaLPzoueayxmO-0TPFvlXRlugx-m_5jVauUYNCD--a_LHkJ1jeX4nzEVz0tY2baaB9UTL0qnuSKUMolxPYz-ZX9-TrI_J_sdVfk4ZS38TBj8mG_iTInnfYnqyptBUq6PmNAdw_5TaCLeE9tAA1JA02_PSG7o24z8SOgPjF_GRAIc36v1R3zXtAecljP4gbD6XXJpCtGCGI-ovFnH-3Zm_3grbHbfH6ACORjVuHKzaO0rLNZrdkxeKPT38RVoqmGUEqMuLi8VyJ1UgnjQi0CK7rlcZ4SvG1dJ_ASN2do5dNoi9W_WhtCyE4W5NTX0BQVngEClLc_HEalqCoxrP62jzr_mTEShaIMs-hXSMGbg0nGRUwqUKSYQJTD9K9x4vCMLz1YCpmeStIek5WFEeaDkwx6GuW9HJBI5fS5jiGPRXKuCixr5g3D37TSa_2fzpVMRvoXG-OAVOVjA23MJIWDjM52rrSIsFtvY4gQnuFkGDRJzJRS10Rnb4Kelq2Vy7OMh5f_ZU_S6tL7o5hmbBie7Ltwtx2_q8HaW7sb5KclC38xetI8_2-5Ms6gkmNRQLixy2wtp8VuufczPHAB6Byw3t35KxUpwqz3s_l7behPFWJwVOzMoDVeWjbjdWhsAgCLyafWgfYxlxTmAMrLoD53ZoUSYNuAZqRKJdKMBXmhhi_q9hmqNJhjupfu3rHsao17IMf0K_ixrS1OYZtkdEHbShtTdqazdohugM9DHR62rhHdK_rmDp90CctedIkV7L5J3IgOZAed5c1z1hK2S5oDF6Gd8yS2KMFfLI-jtiKiF4VmSwZfYvXtYRPeECzHFlBDrhY6ZUxii1bK6l_yh5ZUjZ76dY41W4bgHc8x03zf2iVe06ngKYl7jBgPsGD7CfBzykIYfbqI9ml8rK7XqfEA4kmuDxVxZBhrPCoSl4bwhZj6TyBGFCs46foeGqFr_yn8bWFK5TP1HMCvERSvZ7DhX9bDVGOt4dRBTORqIVBZ2bqq-ClCCiqFe35O1dzVxRFelzMOKcq-PgbcPXJ-436PPY8jv92iRBCYIBSVsAYCfJoDFU1V0XYmP8kQeNLqTyfyWQNp2YrgawB9Nt6w5kU0TX44GrNT_cYDtvPEdX4BAWgaAWNqu0Bc8ucNNTlUnzTs_Nrz--GgakKHhQGw4RBEqK_G41zN_ugSUaDoz3Da86TtTFSYWD_PefJtHbUk-qOUSGFEOdJ69x4BNQlsosKrY5vBpSt-Lj78JhsWAc-jyqtI0t9JSpGQttsoZg8jUi9fRVPVZZyx8AJhRVMFxlFM1FSeUBh5Cp5BjUWAuMJvrpyRV64mKnIEnLaOHoA

//https://devito.test:5173/?t=2024-04-16T05:20:04.857Z&p=XQAAAALCEgAAAAAAAAAtiKxZCEMyd9kuusGLU5bowhXCHrTZ3EcnnuhIX5gPEfgny_1JtLRn6GeOSSUb_3wMzqq3iMib52FGj4th0PTB6R2zoXhKAs8q4Qx9tuj2Z2tMLNkQ7FrPPUpyox0DLyS_XDMTDyMsoHyIQXyj5Eq4WV91X75llPbWUf9J-vfkUQAVEBrOOgbxgbcnfxnWagpce2n3xa6SuGm9rC1SX5AftbLJ4oAJ5rL_OPeQhyjcbqznuMqB14lpzRllr8NK7LTerKL7Q-8j3fAzvrRUOPGUdsEweifoEgqQnoXC83GSzQpY4Y8zLDWe-IHwlWMvC0E5Tn77xTZlYz_v-aUTZZX6Bc7pCZqOerE6Qmh_tEi21NmaLPzoueayxmO-0TPFvlXRlugx-m_5jVauUYNCD--a_LHkJ1jeX4nzEVz0tY2baaB9UTL0qnuSKUMolxPYz-ZX9-TrI_J_sdVfk4ZS38TBj8mG_iTInnfYnqyptBUq6PmNAdw_5TaCLeE9tAA1JA02_PSG7o24z8SOgPjF_GRAIc36v1R3zXtAecljP4gbD6XXJpCtGCGI-ovFnH-3Zm_3grbHbfH6ACORjVuHKzaO0rLNZrdkxeKPT38RVoqmGUEqMuLi8VyJ1UgnjQi0CK7rlcZ4SvG1dJ_ASN2do5dNoi9W_WhtCyE4W5NTX0BQVngEClLc_HEalqCoxrP62jzr_mTEShaIMs-hXSMGbg0nGRUwqUKSYQJTD9K9x4vCMLz1YCpmeStIek5WFEeaDkwx6GuW9HJBI5fS5jiGPRXKuCixr5g3D37TSa_2fzpVMRvoXG-OAVOVjA23MJIWDjM52rrSIsFtvY4gQnuFkGDRJzJRS10Rnb4Kelq2Vy7OMh5f_ZU_S6tL7o5hmbBie7Ltwtx2_q8HaW7sb5KclC38xetI8_2-5Ms6gkmNRQLixy2wtp8VuufczPHAB6Byw3t35KxUpwqz3s_l7behPFWJwVOzMoDVeWjbjdWhsAgCLyafWgfYxlxTmAMrLoD53ZoUSYNuAZqRKJdKMBXmhhi_q9hmqNJhjupfu3rHsao17IMf0K_ixrS1OYZtkdEHbShtTdqazdohugM9DHR62rhHdK_rmDp90CctedIkV7L5J3IgOZAed5c1z1hK2S5oDF6Gd8yS2KMFfLI-jtiKiF4VmSwZfYvXtYRPeECzHFlBDrhY6ZUxii1bK6l_yh5ZUjZ76dY41W4bgHc8x03zf2iVe06ngKYl7jBgPsGD7CfBzykIYfbqI9ml8rK7XqfEA4kmuDxVxZBhrPCoSl4bwhZj6TyBGFCs46foeGqFr_yn8bWFK5TP1HMCvERSvZ7DhX9bDVGOt4dRBTORqIVBZ2bqq-ClCCiqFe35O1dzVxRFelzMOKcq-PgbcPXJ-436PPY8jv92iRBCYIBSVsAYCfJoDFU1V0XYmP8kQeNLqTyfyWQNp2YrgawB9Nt6w5kU0TX44GrNT_cYDtvPEdX4BAWgaAWNqu0Bc8ucNNTlUnzTs_Nrz--GgakKHhQGw4RBEqK_G41zN_NlRKgvsg3O6Nta7Sgh7KNLlPj8fQn5KfbnEj5SL_rOZ1gZd92mzk8IWIAZ_3tAoJb99VXChQp0edP1Qffty8AzkswgM9KTqMBUuRxRPTV396LWRcrgGDeNgMBOPRZtweGLPHfDDOfvYtvociDKl_kiPMauq5m4eCr0uymu59Bgy0dLnDBKOZn0KCtJ0_cPdIIiw7EA

//https://devito.test:5173/?t=2024-04-18T11:18:23.209Z&p=XQAAAAL8EgAAAAAAAAAtiKxZCEMyd9kuusGLU5bowhXCHrTZ3EcnnuhIX5gPEfgny_1JtLRn6GeOSSUb_3wE4QIJ_YXHMyd1No1--XxSiqj9ZJqO_ElsnjmqLwrgt5wXV7xsfg9JAG7ws2YTPT4pbyXqm2D21VcBiCXL7ijnRvCeXTK5LycDKWniwly9Euh0TumeuyCRjqt69FzwF5VzioI60pj7qIsc0lUF-0yGF9sOaJP8pGsPKO8w2YRQjTC-D1pvPdw3L9Uem4xztF-JkBwEHIYru9S6Nd3T2ZsL15sS7fr-Pb23ckoXkaqHZzZZzuqTHJJm5wn7FS5yfvebzjsECiO54kBkvMabLNu75Fe__-GE5EAowCP3ctNu5_S6Q9mJvjttoD3HnRnhAUB5_7ZNWfUUDrWYRheyIbofy_aQaEEG7NiJC_VCewtnzIUqzyzWTPa3rQwO2fk3ps8SxIoItcpW1C6oI2SUsbBjmJVe5K2dQ_wY2RYQVF-cOjQUwXjfrI1QOmz4BXhLVq3C9RpP7dCsvT5EtC1ZRUioP-4tjvCUmcdfrUL_7phhNxmntSDicqT9-BwXaS4CWiYteBT7cjDDlIa-VLEqC79vJSgASCmrzuuGjcf80h0wZ6dJohEPJ9WASYiVpMfIUocvP-qMlwa7vobAp834kjqyH9kjyRJweRYpx0u4SZNqaqILxtMsAUdtQOAvp_6ZxcWd-Iqz63hTYu5WuF_iQmHj1IR52GMBl1AVMtuz6wO0x0RyAX4YbTWncooh5Mffpgvdz3swMEMmD4zCzM6k4WB3QWbrD_YW__MNt3xG8eyduLNS6ChZ_Fe4HNQfoiL0l9uazId6KwHgha8gz6SeybqF9gwNrrmfEMds9GGQuegor773a7vAez56KGS-0-Aq7mMYRuoEut8PqU5JjHy8vUQ0vBqa_ErVNZWQ8_lprH7bNIoQAD14Y5XsNed6sTcJkYUYgqrvM2Ekj0C4BuxEYG2nGs5zLuL5MM5fwR8TLieA7_4uDAiN6joneQaAvujKvLFKlF7bOV5B_vEw4U7FzaL7ptoV4ifKnPKtCgUODTSs6zQLVPIY1KBrJpjOXyZUW07k95GZOczyiQcJz-xnVFQDxX9Arn8zClwiMhZwFFAV2uSVUMf0hwaa4xVCjA-hk6Q4C3U6UaNdsy7WYitCo_2k-s9NXPCX_ZJtpg5uYnokx3uib1pg7tvJaWJFYMePUNg8WLQ7WeHTxgTP6b5CLP7hN47ybcAUOxxRqHqt5DQodfRROzn-M2pNjufQaEU6W_OGlzXtWfIs57Ctd4alqYaLCrZOJctV3eg-p9kDsYtAtkxHD-x5mpdyKEJIfyG_aVrxDgI0CLP0FQESlTGZCT_v2PWEAbgfI5M9ZWxydAK_HcVM0FY5LMd7HI1LCfOaPwAjufh0Z2o-iKBPZLQXi_Khefl_gz0Aa8pIPmz8w63QW-dHEsPWRDENRkKsNn-I_86KHK2efDNd9RKALmt6qP9fe5QmRJ2fX2MnbJp0zIV5LhsfDOcG70yR_G0g_-aoA5i35uaVAqyIoy3bFSJqGLRv4-_jD91wyxB29zBj7uv3amznzlAtyahLXPCrIwzHSEf6ARkBwC_-QJcpSeLjJDiH0o6DptgXyHtcMYjqwHCzSwQ0AvoG1mhk6B0x20NtL6uKxcIIi-vTHpG8RMTLLxCZL3YlCIR50pwQtD-YKlAmGfYvvE5ciDOJtJXYXneCx8krSzTyR_JubZUR_5F5EUOseGfeKlt92YHD_aaj9wBFDvBsCIg2E8XOcdzxDO-FiG4cihabYjbIS1ydy7qfhAA%253D

    const demo_p = `XQAAAAL-DAAAAAAAAAAtiKxZCEMyd9kuusGLU5bowhXCHrTZ3EcnnuhIX5gPEfgny_1JtLRn6GeOSSUb_3wMzqq3iMib52FGj4th0PTB6R2zoXhKAs8q4Qx9tuj2Z2tMLNkQ7FrPPUpyox0DLyS_XDMTBgJJ2q4tG11vZkKx55MD5cIhVfIVQiHhKxX66_zyVMP69tYxoP-hiZqgiimd0agcmt5t-PcN_bEUmKikNSOP0osnxBEZ0cD13bMxpJMb92khQwHfy7R9xbCix6FbGnaQfqqgiZEFznxWFYgvFQb_FVCbcIOAF_w6WM1qipFPfp2eTI0zRyUZVYStsn-g0e0M3Vk2Lf1FHa2GZWXKORt8hizjSVLAHIphGSK0mKNTmErH8R5mt1MOGyISvkNmzVeosHg-RobqIgdesWqH-j-cI7pffFm0u2cNCsMuzvDTEGnfug7fcj5u4D1JsUIfHDHk3bpyHfjTOBFIHoIQUP1zBKqtqCS2EigxGBUzZaCTZp8Ik_d5KFh8evuemNbvW9vrmwHJ26kRaWv5erV7FnsQfaLeiI6kvPOuitp0MgZnihHCJPR8wUm651N6RDqEzR8L0i3LRO7_pVY_8XOkIs4A_FYXTFLEqTuFGDqLugY2-eKMEyER_i_tMkBvmMsluATmlbRTVyAn8NMzjvwcgJtmxPIlvm_ysUPuhgEIM_q8RBkNT-awheViGK2lBhJrHxIxL9lMYZE0_lOZiivFIRExHQbLQMd_tk0AqMP13yTXst1ylLM8ql_FMNVKypktgTTuCbUU9Ku8cAVm7d2hy4Bi_mWyJC47TBNXkZLwUWbncZVK8K69VJpSRoWBV1177AQwp952fx4F-ygbs-yWvRleEd40--SCf7g5oNnIxMfhIifJX9nydA2nRk5mfNqdpLKcsT-Z7ZRHQsP-oTdbLRbDwVoZZEbVir9NV3iwDLAkJqW2dcoMOQcjT1GuiQ4vUQYnKBKHuXOCEjm502j15osSOBQy190mJbJD5TQDzpMwGmkoJOWet--2aHf8HAdaNwU58MwANHgoiST4nhBWLZieKJcrEfWeZT4AkRckxBwA4QJ4G58Cpvt2JFA2vmVjFDXiF2GFAenwpbnRYiQdH2cbA7QJPsDJdFtw93cma6LOtKkE3blCt3h0V0AnGX8zX1tcYprHEsL9lOjNfAvrF8TCAn4VK8ayEK8YloPJEYRGiSx6UbaSeCer0yYmbFwaWZOCzwOVdmrLCblFHAa29e3i8wlCVhFUIVWSE49Pn-CVcGqTBKHiFXxrN4S_acVGWFveeJeBTrKo8ZCTdTNdf-x1zNYXX2CI8RGWqC5MVeqOuVTwWcu8WCwNlyZIUsbwcQegaD8ArfrpjPlw6Ji9aatHINO_i4VTExmFpySEBRV3E0uToJYbPq7kDVrMRnr7vWrV_wA%253D`
    lib.project = parse(Date.now(), demo_p)

    return
    // const sources = [
    //   lib.cool_bass_source,
    //   lib.demo_source_kick,
    //   lib.demo_source_hihat,
    //   lib.demo_source_eyo,
    //   lib.demo_source_radio_signals,
    // ]

    // let count = 4
    // const length = 2
    // lib.project = Project({
    //   id: 0,
    //   timestamp: 0,
    //   title: '',
    //   creator: '',
    //   remix_of: 0,
    //   bpm: 144,
    //   pitch: 0,
    //   tracks: Array.from(sources, (source, y) => ({
    //     sources: [source],
    //     notes: [],
    //     boxes: Array.from({ length: count }, (_, x) => ({
    //       source_id: getSourceId(source),
    //       time: 1024 + (x * length),
    //       length,
    //       pitch: 0,
    //       params: []
    //     })),
    //   })),
    //   comments: []
    // })
  }

  project?: Project

  case_source = {
    code: `{ n= f= nt= v=
[adsr 2.5 50 .3 50 nt t 16 * .8 +] env=
[saw f [sqr .1] .10 * +] env * v *
[slp 500 5700 env * + .61]
A= A [delay 122 20 [tri .25 co*] * + ] A @ clip
} midi_in=
`
  }

  source_midi = {
    code: `; a synth
{ n= f= nt= v=
[exp 1 nt] [lp] env=
[saw f nt] v*
[slp 233 1800 env * + ]
env *
} midi_in=
`
  }

  t1_source = {
    code: `;;;kick
{ x=
[sin 80.01 500 [decay .168 128 x] + t x*]
[decay .097 17 x]
} kick=

[kick 4]
`
  }

  t2_source = {
    code: `;;;hihat
{ hz= [saw hz t] [ramp hz t .7389] + } p=
[p 1130][p 1450][p 300][p 620][p 800][p 600]
@ 4* [dclipexp 4.1] clip 8*
[bhp 9100 1.42] [bbp 5400 1.42]
[exp 16 co* t] .81^ [lp 70] *
(.6 .48 1 .54) t 16 * ? *
.2* clip 1*
`
  }

  t3_source = {
    code: `;;;eyo
[sin (513 213) t .5 * ? 111
[sin 500.25 co* t] * + ]
[sin 123 .2
 [sin 8 co* t] * +
 t] *
[sin 1721
1 [sin 4 co* t] - 1200 * +]
[exp 26 t] * + a= a .7*
[delay 148 .91] a +
[clip 2] 1.49 *
[exp 44144 t] [lp] *
[lp] [shp 850]
[inc .097 t 4*] clip 1.8^ *
2 *
`
  }

  t4_source = {
    code: `;;;radio signals
[saw 48]
[sin 4] *
[sin 486
 [sin .125 co* t .25*] 4710 * +]
[exp 1 co* t] * +
[delay 21.25 .91]
[clip 2] 1.49 *
[exp 2 co* t] .55^ [lp] *
[shp 2150]
@ [slp 1833]
1.5 *
`
  }

  source = {
    code: `;;;bass
{ tt= x=
[saw (40 62 42 40) tt x * ?
 200 [decay .125 8 x] +
 tt x*
] [decay .001 20 x]
} bass=

[bass 8 t .5*]
[slp 500 .3] 1*
`
  }

  kick_source = {
    code: `;;;kick
{ x=
[sin 94.01 1000 [decay .168 178 x] + t x*]
[decay .067 17 x]
} kick=

[kick 4]
`
  }

  cool_bass_source = {
    code: `{ n= f= nt= v=
[adsr 2.5 50 .3 50 nt t 16 * .8 +] env=
[saw f [sqr .1] .10 * +] env * v *
[slp 500 700 env * + .61]
A= A [delay 502 250 [tri 1.25 co*] * + ] A @ clip
} midi_in=
`
  }

  radio_signals_source = {
    code: `;;;radio signals
[saw 8]
[sin 4] *
[sin 86
 [sin .15 co* t .125*] 9710 * +]
[exp 1 co* t] * +
[delay 221.25 .91]
[clip 2] 1.49 *
[exp 16 co* t] .55^ [lp] *
[shp 2150]
@ [slp 1833]
1.5 *
`
  }

  demo_source_kick = {
    code: `;;;kick
{ n= f= nt= v=
[dec .015 1.75 nt] env= env
[sin 65 190 env 70^ * + nt] 1.1-
env 45^ *
[sin 65 550 env 60^ * + nt]
env 190^ * .5*
@ [shp 68 .85]
} midi_in=
`
  }

  demo_source_hihat = {
    code: `;;;hihat
{ hz= [saw hz t] [ramp hz t .7389] + } p=
[p 1130][p 450][p 300][p 620][p 800][p 600]
@ 4* [dclipexp 4.1] clip 8*
[bhp 9100 1.42] [bbp 7400 0.72]
[exp 16 co* t] .81^ [lp 70] *
(.6 .48 1 .54) t 16 * ? *
.2* clip 1*
`
  }

  demo_source_eyo = {
    code: `;;;eyo
[sin (11 11) t .5 * ? 1444
[sin 500.25 co* t] * + ]
[sin 123 .2
 [sin 8 co* t] * +
 t] *
[sin 1721
1 [sin 4 co* t] - 1200 * +]
[exp 26 t] * + a= a .7*
[delay 148 .91] a +
[clip 2] 1.49 *
[exp 44144 t] [lp] *
[lp] [shp 850]
[inc .097 t 4*] clip 1.8^ *
.5 *
`
  }

  demo_source_radio_signals = {
    code: `;;;radio signals
[saw 80]
[sin 4] *
[sin 6
 [sin .15 co* t .125*] 221 * +]
[exp 1 co* t] * +
[delay 100.25 .91]
[clip 2] 1.49 *
[exp 6 co* t] .55^ [lp] *
[shp 1150]
@ [slp 833]
1.5 *
`
  }

  demo_antilogos = {
    code: `;antilogos
{ n= f= nt= v=
[adsr 200.5 800 .01 10 nt] env=

[saw f 2/ [sin 1200] 1 * + ]
[saw f 16/ [sqr 104 co*] 200 * + ]
@
env .9^ * v *
[slp 800 17400 env 8^ * + .61]
A= A [delay 100 co* .89] [shp 633 .4] .4* A
@ clip .23* (1 0) t 4 * ? 1 * *
B= B [delay 600 co* .79] [slp 1033 .4] .2* B
@
} midi_in=
`
  }

}

//     `;;;kick
// { x=
// [sin 52.01
//  500 [decay .45 8 x] +
//  t x*
// ] [decay .095 20 x]
// } kick=

// [kick 4]
// `

//     `[saw 232.01]
// [decay .05 5 16]`
//     `[saw 232.01]
// 1 [inc .083 co* t 4*] clip - *`
//     `[saw 22.01]
// 1 [inc .1 co* t 4*] clip - *`
//`[saw 22.01] 1 [inc .1 co* t] clip - *`
//`[saw 22.01] [exp 2 co*] *` //`[inc .01]`

// `; techno kick
// 1 [inc .185 t 4*]
//  clip - 4.2^
//  env=
// [inc 5.5 t 4*]
//  clip 55^
// [inc .17 t 4*]
//  clip 8.85^ 1- *
//  env2=
// [sin 86 112 env* + t 4*]
//  env2*
// .50*
// `
//  `; square after bass
// [sqr (90 104 90 127) t ?
//  [sqr 8 co* t .5*] norm 13 *
//  [tri 12 co* t .5*] norm 7 *
//  + + t]

//  [exp 16 co* t] 2.0^ [lp 8] *
//  [exp .5 co* t] .01^ [lp 4] *

// [slp 3000 4000 [tri 1] *
//  [exp 16 co* t] .57^ [lp 42] *
//  + 0.75]

// [inc .11 t 4*] clip 50.15^
//  .3 + clip *

//  .6*
// `
// }

export const lib = $(new Lib)
