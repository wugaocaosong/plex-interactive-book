# 选择排序

选择排序（selection sort）的原理很简单：开一个循环，每轮从没排序的区间里挑最小的元素，放到已排序区间的末尾。

设数组的长度为 $n$ ，选择排序的算法流程如下图所示。

1. 一开始所有元素都没排序，也就是未排序（索引）区间为 $[0,n−1]$ 。

1. 从区间 $[0,n−1]$ 里选出最小的元素，和索引 $0$ 处的元素交换。这样数组前 1 个元素就排好了。

1. 再从区间 $[1,n−1]$ 里选出最小的元素，和索引 $1$ 处的元素交换。数组前 2 个元素就排好了。

1. 照这样下去，经过 $n−1$ 轮选择和交换，数组前 $n−1$ 个元素就排好了。

1. 最后剩下那个元素一定是最大的，不用再排，排序到此完成。



=== "<1>"

    ![图解步骤 1 / 11 · 选择排序步骤](/genius/media/image_253.png)



=== "<2>"

    ![图解步骤 2 / 11 · selection_sort_step2](/genius/media/image_254.png)



=== "<3>"

    ![图解步骤 3 / 11 · selection_sort_step3](/genius/media/image_255.png)



=== "<4>"

    ![图解步骤 4 / 11 · selection_sort_step4](/genius/media/image_256.png)



=== "<5>"

    ![图解步骤 5 / 11 · selection_sort_step5](/genius/media/image_257.png)



=== "<6>"

    ![图解步骤 6 / 11 · selection_sort_step6](/genius/media/image_258.png)



=== "<7>"

    ![图解步骤 7 / 11 · selection_sort_step7](/genius/media/image_259.png)



=== "<8>"

    ![图解步骤 8 / 11 · selection_sort_step8](/genius/media/image_260.png)



=== "<9>"

    ![图解步骤 9 / 11 · selection_sort_step9](/genius/media/image_261.png)



=== "<10>"

    ![图解步骤 10 / 11 · selection_sort_step10](/genius/media/image_262.png)



=== "<11>"

    ![图解步骤 11 / 11 · selection_sort_step11](/genius/media/image_263.png)

在代码中，我们用 $k$ 来记录未排序区间内的最小元素：

```src
[file]{selection_sort}-[class]{}-[func]{selection_sort}
```

## 算法特性

- 时间复杂度为 $O(n^{2})$、非自适应排序：外循环共 $n−1$ 轮，第一轮内循环执行 $n−1$ 次，最后一轮执行 $1$ 次，即各轮内循环分别执行 $n−1$、$n−2$、$…$、$2$、$1$ 次，求和为 $\frac{n(n−1)}{2}$ 。

- 空间复杂度为 $O(1)$、原地排序：指针 $i$ 和 $j$ 使用常数大小的额外空间。

- 非稳定排序：如下图所示，元素 nums[i] 有可能被交换到与其相等的元素的右边，两者的相对顺序就变了。

![选择排序非稳定示例](/genius/media/image_264.png)
