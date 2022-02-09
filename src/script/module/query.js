/* 使用表格显示 SQL 查询结果 */

import { config } from './config.js';

import {
    getBlockAttrs,
    setBlockAttrs,
    prependBlock,
    getBlockByID,
    updateBlock,
    insertBlock,
    sql,
} from './../utils/api.js';

export async function initWidgetBlock(data) {
    window.document.getElementById('query').style['border-radius'] = data.config.radius;
    // window.document.querySelector('html').style.width = data.config.width;
    // window.document.querySelector('html').style.height = data.config.height;
    window.frameElement.style.width = data.config.width;
    window.frameElement.style.height = data.config.height;
    let payload = {
        id: data.id,
        attrs: {
            // style: `width: ${data.config.width}; height: ${data.config.height};`,
        }
    }
    // console.log(data.id);
    getBlockAttrs(data.id).then(attrs => {
        if (attrs['custom-sql'] == null) payload.attrs['custom-sql'] = data.sql;
        else data.sql = attrs['custom-sql'];
    });
    await setBlockAttrs(payload.id, payload.attrs);
}

export async function codeBlock(data) {
    let previous_block = data.node.previousElementSibling;
    if (previous_block == null) {
        let parent_id = data.node.parentElement.parentElement.querySelector('div[data-node-id]').getAttribute('data-node-id');
        prependBlock(
            parent_id,
            'markdown',
            `\`\`\`sql\n${data.sql}\n\`\`\`\n{: custom-type="query"}`,
        ).then(block => {
            if (block == null) return -1;
            data.code_block_id = block[0].doOperations[0].id;
            return 1;
        });
    }
    else if (previous_block.getAttribute('custom-type') == 'query'
        && previous_block.getAttribute('data-type') == 'NodeCodeBlock') {
        let previous_block_id = previous_block.getAttribute('data-node-id');
        let sql_block = await getBlockByID(previous_block_id);
        data.sql = sql_block.content;
        return 0;
    }
    else {
        let previous_block_id = previous_block.getAttribute('data-node-id');
        insertBlock(
            previous_block_id,
            'markdown',
            `\`\`\`sql\n${data.sql}\n\`\`\`\n{: custom-type="query"}`,
        ).then(block => {
            if (block == null) return -2;
            return 2;
        });
    }
}

export async function widgetBlock(data) {
    await setBlockAttrs(data.id, { 'custom-sql': data.sql });
    data.rows = await sql(data.sql);
    // console.log(data.rows);

    if (data.rows.length <= 0) {
        window.alert("查询结果为空!\nThe query result is empty!");
        return 1;
    }

    let markdown = [];

    if (data.config.query.regs.blocks.test(data.sql)) { // 匹配指定正则的 SQL 查询
        let header = []; // 表头
        let align = []; // 对齐样式
        header.push('|    |');
        align.push('| -: |');
        for (let field of data.config.query.fields) { // 根据自定义字段列表，构造表头
            header.push(` ${field} |`);
            align.push(` ${data.config.query.align[field]} |`);
        }
        markdown.push(header.join(''));
        markdown.push(align.join(''));

        // REF [JS几种数组遍历方式以及性能分析对比 - 撒网要见鱼 - 博客园](https://www.cnblogs.com/dailc/p/6103091.html)
        for (let i = 1, len = data.rows.length; i <= len; i++) {
            // 每一条查询记录
            let row = data.rows[i - 1];
            // console.log(row);

            let row_markdown = [];
            row_markdown.push(`| ${i} |`);
            for (let field of data.config.query.fields) { // 根据自定义字段列表，构造表格
                row_markdown.push(` ${data.config.query.handler[field](row)} |`);
            }

            markdown.push(row_markdown.join(''));
        }
    }
    else {
        let header = []; // 表头
        let align = []; // 对齐样式
        let header_row = data.rows[0];
        let keys = Object.keys(header_row)
        header.push(`|    |`);
        align.push(`| -: |`);
        for (var key of keys) {
            header.push(` ${key} |`);
            align.push(` :- |`);
        }
        markdown.push(header.join('')); // 表头
        markdown.push(align.join('')); // 对齐样式

        for (let i = 1, len = data.rows.length; i <= len; i++) {
            // 每一条查询记录
            // console.log(row);
            let row = data.rows[i - 1];
            let row_markdown = [];
            row_markdown.push(`| ${i} |`);
            for (var key of keys) {
                if (row[key] == '' || row[key] == null || row[key] == undefined) {
                    row_markdown.push(` |`);
                }
                else {
                    row_markdown.push(` \`${row[key]}\` |`);
                }
            }
            markdown.push(row_markdown.join(''));
        }
    }

    markdown.push('{: custom-type="query-result"}');
    data.markdown = markdown.join('\n');
    // console.log(data.markdown);
    return 0;
}

export async function tableBlock(data) {
    // 将查询结果渲染到页面中
    let next_block = data.node.nextElementSibling;
    // console.log(next_block);

    if (next_block
        && next_block.getAttribute('custom-type') == 'query-result'
        && next_block.getAttribute('data-type') == 'NodeTable'
    ) { // 若下一节点有查询结果
        // 更新查询结果节点
        let id = next_block.getAttribute('data-node-id');
        await updateBlock(
            id,
            'markdown',
            data.markdown,
        );
    } else { // 若下一节点无查询结果
        // 创建查询结果节点
        await insertBlock(
            data.id,
            'markdown',
            data.markdown,
        );
    }
    return 0;
}
