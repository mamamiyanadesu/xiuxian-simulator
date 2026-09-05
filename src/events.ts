import type { Encounter } from './types.ts';

export const EVENTS: Encounter[] = [
  {
    id: 'last_batch', title: '最后一炉', place: '青岚坊 · 丹药摊',
    paragraphs: [
      '摊主正在拆招牌。见你停下，他又把“清仓”二字扶正了。',
      '“最后一炉养元丹。家师闭关去了，往后有灵石也买不着。”',
      '桌上三瓶丹药，封口都很新。竹篓里却有几十张揭下来的旧丹签。有一张，上个月来时就贴在这里。',
      '你问为何换签。他捻掉瓶底一点红末。“师父嫌从前的字不吉利，耽误药效。”',
      '替他温炉，可以取一瓶；肯替他把旧丹重新封好，整炉余药都归你。',
    ],
    clues: ['新封口', '旧丹签', '瓶底红末'],
    truth: '药确实有用，但省了清除杂质的工序。旧签与红末早已露出端倪。',
    investigation: '半粒丹药化开，药气下沉，红末浮在水面。清杂那道火候省了。你记下丹号，也试出了重炼的火候。',
    choices: [
      { id: 'refine', label: '重炼后取药', gain: 10, heart: 5, investigated: true, setFlags: ['pill_visited', 'batch_known'], result: '你补足火候，将红末滤掉。摊主说你太讲究，又把滤出的红末装进另一只瓶。' },
      { id: 'one', label: '温炉，取一瓶', gain: 12, heart: 15, risk: { kind: '丹毒', chance: .3 }, setFlags: ['pill_visited'], result: '药力确实涨了。摊主称赞你识货，顺手把清仓的牌子擦得更亮。' },
      { id: 'all', label: '封好旧丹，全拿走', gain: 22, heart: 30, risk: { kind: '丹毒', chance: .6 }, setFlags: ['pill_visited'], result: '你替旧丹换上新签，换来整炉药。离开时，下一个客人正问是不是新炼的。摊主指了指你的背影。' },
      { id: 'leave', label: '记住丹号，离开', gain: 0, heart: 0, setFlags: ['pill_visited', 'batch_known'], result: '你没拿药，只记住了丹号。摊主说修行人疑心太重，容易生心魔。' },
    ],
  },
  {
    id: 'elder', title: '前辈的一点小忙', place: '许家别院 · 丹房',
    paragraphs: ['许前辈听说你快要结丹，握着你的手，叹了很久。“散修难啊。我年轻时，也没人肯帮。”', '他愿传你一道真气，只求照看一夜丹炉。契书上却写着“看护至丹成”，“一夜”二字，是刚添在旁边的。', '你问炼什么。“延寿丹。”院里三个看炉人，最老的听见“一夜”，抬头看了看天，又把添柴的手缩回袖中。'],
    clues: ['看护至丹成', '手写的一夜', '年老的看炉人'],
    truth: '许前辈反复添药，丹炉每次重新计时。你签下的是完成条件，不是一个夜晚。',
    investigation: '看炉人掏出添药簿。前辈每到成丹便添新药，已经添了七回。你抄下日期，决定把时限写进正文。',
    choices: [
      { id: 'limit', label: '写定时限，只守一夜', gain: 6, heart: 2, result: '前辈读了三遍时限，少传了些真气。天亮后你准时离开。他说以后有大机缘再找你，这次没取契书。' },
      { id: 'accept', label: '受真气，签原契书', gain: 22, heart: 30, contract: 'accept', result: '真气入体，确非虚言。你收起契书。纸尾写着，提前退出须归还本次所受的 22 修为。炉火还等着你。' },
      { id: 'leave', label: '婉拒好意', gain: 0, heart: 0, result: '你松开前辈的手。他已经握住下一位散修，叹了一口同样长的气。' },
    ],
  },
  {
    id: 'cave', title: '各凭本事', place: '落照山 · 旧洞府',
    paragraphs: ['赵道友带来两个同伴。三个人衣袖上的补丁，针脚一模一样。', '“咱们散修，出门靠朋友。所得按功劳分，绝不让人吃亏。”', '他请你守生门，自己带同伴进去取宝。你问守阵算几成。“得看里头有什么。”', '洞门被风推开一线，露出半句石刻。守生门者，不得离位。'],
    clues: ['同样的补丁', '分法未定', '生门不得离位'],
    truth: '两个同伴都是赵道友的纸身，不能分担阵力。阵法可以轮班，独守的代价落在你一人身上。',
    investigation: '阵图标明须两名活人交替运转。你伸手碰那两位的腕脉，纸糊的皮肤凹了下去。赵道友赶紧把衣袖拉平。',
    choices: [
      { id: 'rotate', label: '本人轮班，先定分成', gain: 10, heart: 5, investigated: true, setFlags: ['cave_visited'], result: '赵道友亲自接过阵盘。分宝时，他的两个纸身没有再占份额。你拿走写在纸上的那份。' },
      { id: 'trust', label: '相信道友，先守阵', gain: 6, heart: 2, risk: { kind: '经脉暗伤', chance: .6 }, setFlags: ['cave_visited'], result: '“我寻路一功，这位破门一功，那位取宝一功。道友守阵，也算一功。”四份宝物，他自己面前放了三份。' },
      { id: 'advance', label: '先给半卷功法，再守', gain: 12, heart: 15, risk: { kind: '经脉暗伤', chance: .3 }, setFlags: ['cave_visited'], result: '半卷功法已经到手，阵力却没少半分。赵道友出来时说，幸好事先说清，免得伤了和气。' },
      { id: 'leave', label: '退出这份交情', gain: 0, heart: 0, result: '赵道友说你不信朋友。洞口刮起一阵风，他连忙按住两个同伴。' },
    ],
  },
  {
    id: 'fire', title: '炉火未熄', place: '许家别院 · 再到丹房', followup: true,
    paragraphs: ['天刚亮，许前辈又往炉中添了一株灵草。“差一点就成了。”', '他见你看向院门，补了一句。“你此刻走，昨夜的火候便可惜了。”', '你把契书展开。这回若再守，须先划去“丹成”，写下最后期限。'],
    clues: ['添药后重计时', '原契可退真气'],
    truth: '前次花掉的时间不会回来。你能决定的是下一次是否继续，以及按什么条件继续。',
    choices: [
      { id: 'finish', label: '再守一程，写死期限', gain: 10, heart: 5, life: 3, contract: 'settle', result: '你守完最后一程，领走写定的真气。前辈把“丹成”两字添回新契书，递给了刚进门的人。' },
      { id: 'refund', label: '归还原受真气，退契', gain: 0, heart: 0, refund: 'full', contract: 'settle', result: '你归还当初收到的真气。前辈说你白忙一场。你看看自己的手，终于不用再添柴。' },
      { id: 'negotiate', label: '凭添药簿，只退一半', gain: 0, heart: 0, refund: 'half', investigated: true, contract: 'settle', result: '你把添药日期逐条念出来。前辈怕新来的听清，收回一半真气就送你出门。' },
    ],
  },
  {
    id: 'cure_shop', title: '祖传清毒方', place: '白石集 · 新开的药铺', eligibleFlag: 'pill_visited',
    paragraphs: ['新牌上写着“祖传清毒方”。坐堂的，正是青岚坊的摊主。', '他也认出了你，伸手把“初诊免钱”的木牌翻了过去。', '“卖药是家师的手艺，清毒是师祖的手艺。各论各的。”'],
    clues: ['同一位摊主', '翻过去的木牌'], truth: '卖有杂质的药，再卖清杂方法。他不需要换手艺，只需要换块牌。',
    choices: [
      { id: 'claim', label: '报出丹号，索清毒方', gain: 0, heart: 0, life: 2, flag: 'batch_known', cure: '丹毒', result: '你把丹号念给候诊的人听。他立刻递出药方，亲自替你化去丹毒，叮嘱千万别耽误别人看病。' },
      { id: 'work', label: '只做药材分拣', gain: 6, heart: 2, result: '你替他分好药材，领一缕可当场验明的真气。红末那一格，你没有碰。' },
      { id: 'leave', label: '看清招牌，离开', gain: 0, heart: 0, result: '出门时你看见背面还有一行字。“祖传养元丹”。翻过来便能继续做。' },
    ],
  },
  {
    id: 'cave_return', title: '可靠的新朋友', place: '落照山 · 山脚', eligibleFlag: 'cave_visited',
    paragraphs: ['赵道友又来了。“这回另找了两个可靠的人。”', '他身后两人拱手，袖口已经换了新布。你没有看袖口，先问两位姓什么。', '赵道友说，让他们自己说。两人一齐张嘴，都等着他开口。'],
    clues: ['同时张嘴', '新换的袖口'], truth: '换衣服没有改变纸身不能承担阵力的事实。赵道友仍然需要一个活人。',
    choices: [
      { id: 'outside', label: '只找外山药草', gain: 6, heart: 2, result: '你只在山外采药，各自拿走各自那份。两个新朋友负责提篮，倒确实任劳任怨。' },
      { id: 'rotate', label: '写定本人轮班', gain: 10, heart: 5, life: 2, result: '你这次连轮班时辰也写了进去。赵道友说朋友间何必如此，却把名字签得很清楚。' },
      { id: 'again', label: '再信他一回', gain: 12, heart: 15, risk: { kind: '经脉暗伤', chance: .6 }, result: '新衣服很结实，纸身还是纸身。你守着生门，听见里面又在讨论谁的功劳更大。' },
    ],
  },
  {
    id: 'manual', title: '只传有缘人', place: '听雨亭 · 旧书摊',
    paragraphs: ['摊上摆着一卷“无缺周天诀”。书生说，此诀只传有缘人。', '你翻到最后，书页齐整，页码却从八跳到了十。', '“第九页涉及师门隐秘，须先把前八页练熟。到那时，道友自然与下一卷有缘。”'],
    clues: ['跳过的第九页', '另售的下一卷'], truth: '缺页正是周天收束法。照着残卷熟练运转，只会把缺口练得更牢。',
    investigation: '你把行气路径首尾连起，最后一段无处落笔。缺的收束法可以用基础吐纳补上，收益也只能按基础算。',
    choices: [
      { id: 'patch', label: '补全基础周天再练', gain: 10, heart: 5, investigated: true, result: '你用旧法补上缺口。书生说这已经失了本门真意，转头却问能不能借去抄一遍。' },
      { id: 'copy', label: '替人抄书，换真气', gain: 6, heart: 2, result: '你只抄不练，按字数收了工钱。缺页仍是空白，你没有替它编一个结尾。' },
      { id: 'practice', label: '照残卷速成', gain: 22, heart: 30, risk: { kind: '功法缺陷', chance: .6 }, result: '前八页确实进境神速。书生祝你早日有缘买下后卷，连折扣都替你留好了。' },
    ],
  },
  {
    id: 'spring', title: '福地的下游', place: '回风谷 · 灵泉',
    paragraphs: ['守泉人说，谷中泉水不分贵贱，人人都能引气。', '上游围着新砌的石渠。最浓的灵气进了别院，留给散修的水仍很清。', '石渠边有一道裂口。钻进去，可以赶上每日开闸的那股急流。'],
    clues: ['上游分流', '裂口旁的冲痕'], truth: '下游收益少但水势平稳；裂口灵气浓，闸开时的冲击也真实存在。',
    investigation: '你等了一次开闸。冲痕正对裂口，旁边岩窝却能避开水头。找准位置便能借流。',
    choices: [
      { id: 'pool', label: '在下游慢慢吐纳', gain: 6, heart: 2, result: '你坐在下游，收下剩余的灵气。守泉人巡视经过，说大家所得都源于同一眼泉。' },
      { id: 'shelter', label: '借岩窝避开水头', gain: 10, heart: 5, investigated: true, result: '急流擦着岩壁过去。你在水头之后引气，既没抢上游的位置，也没替上游承受冲击。' },
      { id: 'rush', label: '钻裂口，抢开闸', gain: 22, heart: 30, risk: { kind: '经脉暗伤', chance: .6 }, result: '灵气与水头一齐撞进经脉。守泉人把裂口记在簿上，明日准备增设一个收费的位置。' },
    ],
  },
  {
    id: 'herb', title: '百年灵草', place: '苦竹坡 · 药圃',
    paragraphs: ['药农请你帮忙采百年灵草。竹牌上写着整整一百年，旁边还有一个刚描过的小点。', '他掀开药田的催生阵给你看。“一天抵一年，算起来只多不少。”', '老根仍在泥里，新叶油亮得有些发紫。'],
    clues: ['催生阵', '发紫的新叶'], truth: '催生使新叶积了未化开的药性。老根长得慢，反而能正常炼化。',
    investigation: '你尝了根须，又验新叶。催生的药性都挤在叶脉里，分开用才不至于伤身。',
    choices: [
      { id: 'roots', label: '只收老根', gain: 6, heart: 2, result: '你收下老根。药农留下新叶，说明年还能继续卖百年的，只须再描一个点。' },
      { id: 'sort', label: '分出可用的药性', gain: 10, heart: 5, investigated: true, result: '你挑出能炼化的部分。药农说如此细分，百年的名头就不好叫了。' },
      { id: 'leaves', label: '整株炼化', gain: 12, heart: 15, risk: { kind: '丹毒', chance: .3 }, result: '一株进境抵得上数株。那未经化开的催生药性，也没有留在田里。' },
    ],
  },
  {
    id: 'ferry', title: '顺水的人情', place: '白苇渡 · 旧渡船',
    paragraphs: ['船家愿付真气，请你替渡船推一程水。前方顺流，看起来并不难。', '他又放上两个大箱子，说是顺带。“修行人搭把手，总不能按凡俗斤两计较。”', '吃水线没过了船舷上原先的记号。'],
    clues: ['加上的货箱', '被淹的吃水线'], truth: '货重使推水耗力增加。人情的说法没有让箱子变轻。',
    investigation: '你拆开绳头，发现箱中是镇船铁。少装一箱，吃水便回到旧线。',
    choices: [
      { id: 'shore', label: '只在岸边引水', gain: 6, heart: 2, result: '你按岸边的活领了真气。船家抱怨修行人算得太清，数给你的却一缕不多。' },
      { id: 'unload', label: '卸一箱再推船', gain: 10, heart: 5, investigated: true, result: '船轻了，水也好推了。船家把留下的箱子藏在芦苇里，等下一位有缘人。' },
      { id: 'push', label: '一并送过河', gain: 12, heart: 15, risk: { kind: '经脉暗伤', chance: .3 }, result: '你把船和两箱镇船铁都推过河。船家给了应许的真气，说这便是顺水人情。' },
    ],
  },
  {
    id: 'inscription', title: '前人已替你试过', place: '问道崖 · 石壁',
    paragraphs: ['石壁刻着一条冲境捷径，旁边列了十七位成功前辈的名字。', '守崖人说，名字都是真的。你往下一看，落款处还有许多被凿平的浅坑。', '“未能留名者，道心不坚，不足为训。”'],
    clues: ['十七个名字', '凿平的浅坑'], truth: '捷径省去护脉步骤。成功者的名字确实真实，被凿去的人也曾照着练过。',
    investigation: '你摸出旧凿痕下半句“护脉先行”。守崖人说那是旧法。你把旧法和捷径并排记下，缺的环节便显了出来。',
    choices: [
      { id: 'old', label: '仍按旧法修习', gain: 6, heart: 2, result: '旧法缓慢，行气首尾俱全。守崖人没有给你刻名字，倒也不必急着替你凿掉。' },
      { id: 'complete', label: '补护脉，再试新法', gain: 10, heart: 5, investigated: true, result: '你把省掉的工夫补了回来。进境没碑上那么快，也不必拿自己去补一个浅坑。' },
      { id: 'shortcut', label: '循名录走捷径', gain: 22, heart: 30, risk: { kind: '功法缺陷', chance: .6 }, result: '你照石壁运转，修为猛涨。守崖人取出凿子，两头都磨得很利。' },
    ],
  },
  {
    id: 'alms', title: '一席之地', place: '松风庵 · 讲经会',
    paragraphs: ['庵主开讲，前排坐垫留给捐过香火的人。你站在门边，也听得清楚。', '管事递来一张添座的功德簿。“替本庵引来三位善信，就能向前挪一排。”', '门口那位老人招来三个人，管事夸他诚心，把他的旧垫子收走了，先给新来的坐。'],
    clues: ['门边也听得清', '挪动的坐垫'], truth: '听经本身有益。招人和占座不增加经文，只会让你更难放下已经费掉的心思。',
    choices: [
      { id: 'listen', label: '就在门边听完', gain: 6, heart: 2, result: '你听全了经文。散场时前排仍在排功德，门边已经能看见山色。' },
      { id: 'sweep', label: '扫庭，换一次答疑', gain: 10, heart: 5, life: 2, result: '庵主答完一个实在问题。管事想给你记功德，你说工钱已经收了，把扫帚放回墙边。' },
      { id: 'recruit', label: '替庵主传法招人', gain: 12, heart: 15, result: '你领到传法的真气，也记住了该如何劝人往前坐。离开时，总想再回头数数自己招来的那一排。' },
    ],
  },
];

export const FALLBACK: Encounter = {
  id: 'quiet', title: '山中无事', place: '无名山 · 背风处',
  paragraphs: ['山道暂时没有新的机缘。你找了块平石，照从前学过的法门吐纳。', '没有人替这门功法写过传奇。传它给你的老修士，只说过别练岔了。'],
  clues: ['熟悉的基础法门'], truth: '基础吐纳收益不高，却无需依赖他人的许诺。',
  choices: [{ id: 'practice', label: '坐定，修一程', gain: 6, heart: 2, result: '真气按旧路走完一周天。山风吹过去，什么额外的承诺也没留下。' }],
};
export const EVENT_MAP = Object.fromEntries([...EVENTS, FALLBACK].map(e => [e.id, e]));
