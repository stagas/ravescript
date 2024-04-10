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
            { time: 0, length: 1, slope: 1, amt:  1 },
            { time: 1, length: 1, slope: 1, amt: -1 },
            { time: 2, length: 1, slope: 1, amt:  0 },
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
