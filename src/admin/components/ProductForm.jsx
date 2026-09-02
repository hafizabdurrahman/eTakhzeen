import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import service from '../../backend/service';
import { slugify } from '../../utils/slug';

// initialData = null -> create mode. initialData = row object -> edit mode.
function ProductForm({ initialData, categories, groups, onDone, onCancel }) {
    const isEditMode = Boolean(initialData);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        setError,
        clearErrors,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            price: initialData?.price ?? '',
            category: initialData?.category || '',
            group: initialData?.group || '',
            slug: initialData?.slug || '',
            fileId: initialData?.fileId || '',
        },
    });

    const [submitError, setSubmitError] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [checkingSlug, setCheckingSlug] = useState(false);
    // Tracks whether the slug was hand-edited by the user — once they touch
    // it directly, typing in Name stops overwriting it.
    const [slugTouchedManually, setSlugTouchedManually] = useState(false);

    useEffect(() => {
        reset({
            name: initialData?.name || '',
            description: initialData?.description || '',
            price: initialData?.price ?? '',
            category: initialData?.category || '',
            group: initialData?.group || '',
            slug: initialData?.slug || '',
            fileId: initialData?.fileId || '',
        });
        setImageFile(null);
        setSlugTouchedManually(false);
    }, [initialData, reset]);

    // Auto-generate slug from Name as the user types, unless they've
    // manually edited the Slug field themselves.
    function handleNameChange(e) {
        const value = e.target.value;
        setValue('name', value);
        if (!slugTouchedManually) {
            setValue('slug', slugify(value));
        }
    }

    function handleSlugChange(e) {
        setSlugTouchedManually(true);
        setValue('slug', e.target.value);
    }

    // On Name blur, make sure the derived slug is checked for uniqueness
    // against the table (in case auto-fill produced a slug that's taken).
    async function handleNameBlur() {
        const currentSlug = watch('slug');
        if (!currentSlug) return;
        await validateSlugUniqueness(currentSlug);
    }

    async function handleSlugBlur() {
        const currentSlug = watch('slug');
        if (!currentSlug) return;
        await validateSlugUniqueness(currentSlug);
    }

    async function validateSlugUniqueness(slugValue) {
        setCheckingSlug(true);
        const available = await service.isSlugAvailable({
            slug: slugValue,
            excludeRowId: isEditMode ? initialData['$id'] : undefined,
        });
        setCheckingSlug(false);

        if (!available) {
            setError('slug', {
                type: 'manual',
                message: 'This slug is already taken. Try another.',
            });
        } else {
            clearErrors('slug');
        }
        return available;
    }

    const onSubmit = async (formValues) => {
        setSubmitError('');

        // Final safety check right before saving — catches the case where
        // someone else took the slug between blur and submit.
        const stillAvailable = await validateSlugUniqueness(formValues.slug);
        if (!stillAvailable) {
            setSubmitError('Slug is already in use. Please choose a different one.');
            return;
        }

        const data = {
            name: formValues.name,
            description: formValues.description,
            price: Number(formValues.price),
            category: formValues.category,
            group: formValues.group,
            slug: formValues.slug,
            fileId: formValues.fileId
        };

        try {
            // Upload a new image if one was selected (applies to both create and edit)
            if (imageFile) {
                const uploaded = await service.uploadImage({ file: imageFile });
                if (!uploaded) {
                    setSubmitError('Image upload failed. Product was not saved.');
                    return;
                }
                data.fileId = uploaded['$id'];

                // Clean up the old image on edit, but don't block the save if it fails
                if (isEditMode && initialData.fileId) {
                    service.deleteImage({ fileId: initialData.fileId }).catch(() => {});
                }
            }

            const result = isEditMode
                ? await service.updateProduct({ rowId: initialData['$id'], data })
                : await service.addProduct({ data });

            if (!result) {
                setSubmitError(isEditMode ? 'Failed to update product.' : 'Failed to add product.');
                return;
            }

            onDone();
        } catch (err) {
            console.error(err);
            setSubmitError('Something went wrong. Please try again.');
        }
    };

    // categories/groups now arrive as { name: count } maps from service.js
    const categoryNames = Object.keys(categories || {});
    const groupNames = Object.keys(groups || {});

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="border border-neutral-800 rounded-lg p-4 mb-6 space-y-3 bg-neutral-950"
        >
            <h2 className="text-lg font-semibold">
                {isEditMode ? `Edit: ${initialData.name}` : 'Add Product'}
            </h2>

            {submitError && <p className="text-red-400 text-sm">{submitError}</p>}

            <div>
                <label className="block text-sm text-neutral-400 mb-1">Name</label>
                <input
                    className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                    {...register('name', { required: 'Name is required' })}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
                <label className="block text-sm text-neutral-400 mb-1">
                    Slug {checkingSlug && <span className="text-neutral-500">(checking...)</span>}
                </label>
                <input
                    className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                    {...register('slug', { required: 'Slug is required' })}
                    onChange={handleSlugChange}
                    onBlur={handleSlugBlur}
                />
                <p className="text-neutral-500 text-xs mt-1">
                    URL: {watch('category') || 'category'}/{watch('group') || 'group'}/{watch('slug') || 'slug'}
                </p>
                {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug.message}</p>}
            </div>

            <div>
                <label className="block text-sm text-neutral-400 mb-1">Description</label>
                <textarea
                    className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                    rows={3}
                    {...register('description')}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm text-neutral-400 mb-1">Price</label>
                    <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                        {...register('price', {
                            required: 'Price is required',
                            min: { value: 0, message: 'Price must be positive' },
                        })}
                    />
                    {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price.message}</p>}
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">Image</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-neutral-400"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm text-neutral-400 mb-1">Category</label>
                    <input
                        list="category-options"
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                        {...register('category', { required: 'Category is required' })}
                    />
                    <datalist id="category-options">
                        {categoryNames.map((c) => (
                            <option key={c} value={c} />
                        ))}
                    </datalist>
                    {errors.category && (
                        <p className="text-red-400 text-xs mt-1">{errors.category.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">Group</label>
                    <input
                        list="group-options"
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                        {...register('group', { required: 'Group is required' })}
                    />
                    <datalist id="group-options">
                        {groupNames.map((g) => (
                            <option key={g} value={g} />
                        ))}
                    </datalist>
                    {errors.group && <p className="text-red-400 text-xs mt-1">{errors.group.message}</p>}
                </div>
            </div>

            <div className="flex gap-2 pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting || checkingSlug}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                    {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Product'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default ProductForm;